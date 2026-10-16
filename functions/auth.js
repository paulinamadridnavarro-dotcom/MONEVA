// Cuentas de Moneva: registro e inicio de sesión con correo y contraseña.
// - Las contraseñas nunca se guardan: se guarda un hash PBKDF2-SHA256 con sal aleatoria.
// - La sesión es una cookie HttpOnly con un token aleatorio; en la base solo vive su hash.
// - Los datos de cada persona se guardan en la tabla user_data, ligados a su id,
//   así nadie más puede leerlos.
// Todo vive en la base D1 enlazada como env.DB (ver wrangler.jsonc).

const COOKIE = 'mv_s';
const SESSION_DAYS = 30;
const PBKDF2_ITER = 100000; // máximo que permite Workers
const MAX_FAILS = 10, LOCK_MS = 15 * 60 * 1000;
const MAX_DATA = 2_000_000; // bytes del respaldo por persona
const DATA_KEY = /^moneva_[a-z_]{1,40}$/;
const NOT_SYNCED = new Set(['moneva_owner', 'moneva_gemini_key']);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL, iter INTEGER NOT NULL, created INTEGER NOT NULL, fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS user_data (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)`,
];

let schemaReady = null;
export function ensureSchema(env) {
  if (!schemaReady) schemaReady = env.DB.batch(SCHEMA.map(s => env.DB.prepare(s))).catch(e => { schemaReady = null; throw e; });
  return schemaReady;
}

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function pbkdf2(password, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
}

function readCookie(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([a-f0-9]{64})'));
  return m ? m[1] : null;
}

function sessionCookie(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// Las peticiones que cambian algo deben venir de la propia app (evita CSRF).
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

// Caché breve por instancia para no consultar la base en cada imagen o script.
const cache = new Map();
const CACHE_MS = 60 * 1000;

export async function getSession(request, env, { fresh = false } = {}) {
  const token = readCookie(request);
  if (!token) return null;
  const th = await sha256(token);
  const now = Date.now();
  const hit = cache.get(th);
  if (!fresh && hit && hit.until > now) return hit.user;
  await ensureSchema(env);
  const row = await env.DB.prepare('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?').bind(th, now).first();
  if (!row) { cache.delete(th); return null; }
  const user = { id: row.id, email: row.email, tokenHash: th };
  if (cache.size > 500) cache.clear();
  cache.set(th, { user, until: now + CACHE_MS });
  return user;
}

async function startSession(env, userId) {
  const token = randomHex(32);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires <= ?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)').bind(await sha256(token), userId, now + SESSION_DAYS * 864e5),
  ]);
  return sessionCookie(token, SESSION_DAYS * 86400);
}

async function readCredentials(request) {
  let body;
  try { body = await request.json(); } catch { return { error: 'Petición inválida.' }; }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'Escribe un correo válido.' };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (password.length > 200) return { error: 'La contraseña es demasiado larga.' };
  return { email, password };
}

export async function register(request, env) {
  const c = await readCredentials(request);
  if (c.error) return json({ error: c.error }, 400);
  await ensureSchema(env);
  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(c.email).first();
  if (exists) return json({ error: 'Ese correo ya tiene una cuenta. Inicia sesión.' }, 409);
  const id = crypto.randomUUID();
  const salt = randomHex(16);
  const hash = await pbkdf2(c.password, salt, PBKDF2_ITER);
  try {
    await env.DB.prepare('INSERT INTO users (id, email, salt, hash, iter, created) VALUES (?, ?, ?, ?, ?, ?)').bind(id, c.email, salt, hash, PBKDF2_ITER, Date.now()).run();
  } catch {
    return json({ error: 'Ese correo ya tiene una cuenta. Inicia sesión.' }, 409);
  }
  return json({ ok: true }, 200, { 'set-cookie': await startSession(env, id) });
}

const DUMMY_SALT = '00'.repeat(16);

export async function login(request, env) {
  const c = await readCredentials(request);
  if (c.error) return json({ error: 'Correo o contraseña incorrectos.' }, 401);
  await ensureSchema(env);
  const u = await env.DB.prepare('SELECT id, salt, hash, iter, fails, locked_until FROM users WHERE email = ?').bind(c.email).first();
  const now = Date.now();
  if (u && u.locked_until > now) {
    const min = Math.ceil((u.locked_until - now) / 60000);
    return json({ error: `Demasiados intentos. Intenta de nuevo en ${min} min.` }, 429);
  }
  // Si el correo no existe se calcula igual un hash, para no delatarlo por el tiempo de respuesta.
  const hash = await pbkdf2(c.password, u ? u.salt : DUMMY_SALT, u ? u.iter : PBKDF2_ITER);
  if (!u || !sameText(hash, u.hash)) {
    if (u) {
      const fails = u.fails + 1;
      await env.DB.prepare('UPDATE users SET fails = ?, locked_until = ? WHERE id = ?').bind(fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? now + LOCK_MS : 0, u.id).run();
    }
    return json({ error: 'Correo o contraseña incorrectos.' }, 401);
  }
  if (u.fails) await env.DB.prepare('UPDATE users SET fails = 0, locked_until = 0 WHERE id = ?').bind(u.id).run();
  return json({ ok: true }, 200, { 'set-cookie': await startSession(env, u.id) });
}

export async function logout(request, env) {
  const user = await getSession(request, env, { fresh: true });
  if (user) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.tokenHash).run();
    cache.delete(user.tokenHash);
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

// Script que la app carga antes que todo lo demás: quién eres y tus datos guardados.
export async function meScript(user, env) {
  const row = await env.DB.prepare('SELECT data FROM user_data WHERE user_id = ?').bind(user.id).first();
  const payload = { id: user.id, email: user.email, data: row ? JSON.parse(row.data) : null };
  return new Response('window.MONEVA_SESSION=' + JSON.stringify(payload).replace(/</g, '\\u003c') + ';', {
    headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function saveData(request, user, env) {
  const raw = await request.text();
  if (raw.length > MAX_DATA + 1000) return json({ error: 'Tus datos superan el tamaño permitido.' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Petición inválida.' }, 400); }
  const data = body?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'Petición inválida.' }, 400);
  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    if (DATA_KEY.test(k) && !NOT_SYNCED.has(k) && typeof v === 'string') clean[k] = v;
  }
  const text = JSON.stringify(clean);
  if (text.length > MAX_DATA) return json({ error: 'Tus datos superan el tamaño permitido.' }, 413);
  await env.DB.prepare('INSERT INTO user_data (user_id, data, updated) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated').bind(user.id, text, Date.now()).run();
  return json({ ok: true });
}

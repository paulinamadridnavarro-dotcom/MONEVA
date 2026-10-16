// Worker de Moneva: todo pasa primero por aquí para exigir una cuenta.
// Sin sesión solo se puede ver la página de acceso (/acceso); el resto de la app,
// sus archivos y las rutas /api/* piden haber iniciado sesión.
import { onRequestPost } from './functions/api/agent.js';
import { getSession, register, login, logout, meScript, saveData, sameOrigin, json } from './functions/auth.js';

const PUBLIC = new Set(['/acceso', '/acceso.html', '/js/acceso.js']);

function onlyPost(request) {
  if (request.method !== 'POST') return new Response('Método no permitido.', { status: 405, headers: { allow: 'POST' } });
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/auth/register') return onlyPost(request) || register(request, env);
    if (pathname === '/api/auth/login') return onlyPost(request) || login(request, env);
    if (pathname === '/api/auth/logout') return onlyPost(request) || logout(request, env);

    const isApi = pathname.startsWith('/api/');
    const user = await getSession(request, env, { fresh: isApi });

    if (PUBLIC.has(pathname)) {
      if (user && pathname !== '/js/acceso.js') return Response.redirect(url.origin + '/', 302);
      return env.ASSETS.fetch(request);
    }

    if (!user) {
      if (isApi) return json({ error: 'Inicia sesión para continuar.' }, 401);
      return Response.redirect(url.origin + '/acceso', 302);
    }

    if (pathname === '/api/me.js') return meScript(user, env);
    if (pathname === '/api/data') {
      if (request.method !== 'PUT') return new Response('Método no permitido.', { status: 405, headers: { allow: 'PUT' } });
      if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
      return saveData(request, user, env);
    }
    if (pathname === '/api/agent') return onlyPost(request) || onRequestPost({ request, env });
    if (isApi) return new Response('No encontrado.', { status: 404 });

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('cache-control', 'private, no-cache');
    return out;
  },
};

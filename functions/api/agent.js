// Cloudflare Pages Function: proxy entre el Agente IA de Moneva y la API de Gemini.
// Vive en /api/agent (misma ruta que el fetch de js/agent.js) para que la petición
// sea "same-origin" y no choque con la Content-Security-Policy de la app
// (connect-src 'self'). La clave de API NUNCA viaja al navegador: se lee de una
// variable de entorno secreta configurada en el panel de Cloudflare Pages
// (Settings -> Environment variables -> GEMINI_API_KEY), nunca de este archivo.
//
// Qué recibe: { pregunta, contexto, respuestaLocal }
//   - pregunta: lo que escribió la persona
//   - contexto: datos YA CALCULADOS por el motor de reglas de Moneva (deudas,
//     presupuesto, gasto hormiga, retiro, metas) — nunca localStorage crudo
//   - respuestaLocal: la respuesta de respaldo que ya generó el agente local,
//     por si el modelo prefiere partir de ahí
// Qué devuelve: { text } con la redacción final, o { error } si algo falla.

const SYSTEM_PROMPT = `Eres el Agente IA de Moneva, una app de finanzas personales.
Recibes datos YA CALCULADOS por el motor de reglas de la app (deudas, presupuesto
50/30/20, gastos atípicos y gasto hormiga por rango intercuartílico, proyección de
retiro, metas de ahorro). No inventes ni recalcules cifras: básate solo en los
números que se te dan. Responde en español de México, en un tono cálido y directo,
máximo 180 palabras, pensado para alguien sin formación financiera. Si la pregunta
no tiene que ver con las finanzas personales de quien pregunta, redirige
amablemente la conversación hacia sus datos financieros en Moneva.`;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo de la petición inválido.' }, 400);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY no está configurada en este despliegue.' }, 500);
  }

  const { pregunta, contexto, respuestaLocal } = body || {};
  if (!pregunta || typeof pregunta !== 'string') {
    return json({ error: 'Falta la pregunta.' }, 400);
  }

  const userText = [
    `Pregunta de la persona: ${pregunta}`,
    '',
    'Datos ya calculados por el motor de reglas (JSON):',
    JSON.stringify(contexto ?? {}, null, 2),
    respuestaLocal ? `\nRespuesta de respaldo generada localmente (puedes mejorarla o redactarla distinto, pero no la contradigas en las cifras):\n${respuestaLocal}` : '',
  ].join('\n');

  let upstream;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
  } catch (e) {
    return json({ error: 'No se pudo contactar al modelo: ' + String(e) }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: `El modelo respondió ${upstream.status}.`, detail }, 502);
  }

  const data = await upstream.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  if (!text) return json({ error: 'El modelo no devolvió texto.' }, 502);

  return json({ text });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

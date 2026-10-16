// Worker de Moneva: los archivos de la app los sirve Cloudflare como assets;
// aquí solo llegan las rutas /api/*. Reutiliza la función de functions/api/agent.js.
import { onRequestPost } from './functions/api/agent.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/agent') {
      if (request.method !== 'POST') return new Response('Método no permitido.', { status: 405, headers: { allow: 'POST' } });
      return onRequestPost({ request, env });
    }
    return new Response('No encontrado.', { status: 404 });
  },
};

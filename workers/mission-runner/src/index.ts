export interface Env { WORKER_API_TOKEN: string; OPENAI_API_KEY?: string }
/** Cloudflare Worker entrypoint: secure mission execution gateway. */
const worker = { async fetch(request: Request, env: Env): Promise<Response> { if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 }); if (request.headers.get('Authorization') !== `Bearer ${env.WORKER_API_TOKEN}`) return new Response('Unauthorized', { status: 401 }); const mission = await request.json(); return Response.json({ accepted: true, mission, queuedAt: new Date().toISOString() }, { status: 202 }); } };
export default worker;

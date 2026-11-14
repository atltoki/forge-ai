/**
 * Separate read-only Cloudflare Worker; NOT deployed by this commit.
 * Bind PORTFOLIO to ORBIT's existing KV namespace and configure
 * ORBIT_BRIDGE_TOKEN as a Cloudflare secret of >= 32 random bytes.
 * Exposes only GET /v1/projects; never mutates ORBIT data.
 */
function constantTimeSame(expected, provided) {
  if (!expected || !provided || expected.length < 32 || provided.length > 512) return false;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(provided);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}
export default {
  async fetch(request, env) {
    const headers = {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': 'null',
    };
    const url = new URL(request.url);
    if (url.pathname !== '/v1/projects') return new Response('Not found', { status: 404, headers });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers });
    const authorization = request.headers.get('Authorization') || '';
    const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!constantTimeSame(env.ORBIT_BRIDGE_TOKEN, provided))
      return new Response('Unauthorized', { status: 401, headers });
    if (!env.PORTFOLIO) return new Response('KV binding missing', { status: 503, headers });
    const list = await env.PORTFOLIO.list({ prefix: 'project:', limit: 100 });
    const records = {};
    await Promise.all(list.keys.map(async ({name}) => {
      const id = name.slice('project:'.length);
      if (!/^[a-z0-9][a-z0-9-]{0,45}$/.test(id)) return;
      const record = await env.PORTFOLIO.get(name, 'json');
      if (!record || typeof record !== 'object' || Array.isArray(record)) return;
      const {state, focus, nextAction, reviewDate, evidenceUrl, note, updatedAt, revision} = record;
      records[id] = {state, focus, nextAction, reviewDate, evidenceUrl, note, updatedAt, revision};
    }));
    return Response.json({source:'orbit', records, has_more:Boolean(list.list_complete===false)},
      {headers});
  },
};

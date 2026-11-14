/**
 * Private, read-only D1 priorities bridge for ATL DIRECTOR.
 * Bind PRIORITIES_DB to the dedicated orbit-priorities D1 and configure
 * ORBIT_PRIORITIES_TOKEN as a high-entropy Cloudflare secret.
 * This Worker never writes, never exposes browser CORS, and accepts GET only.
 */
function constantTimeEqual(expected, provided) {
  if (typeof expected !== 'string' || typeof provided !== 'string' ||
      expected.length < 32 || provided.length < 32 || provided.length > 512) return false;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(provided);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/v1/priorities' || url.search || url.hash)
      return new Response('Not found', { status:404, headers:HEADERS });
    if (request.method !== 'GET')
      return new Response('Method not allowed', { status:405, headers:HEADERS });
    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!constantTimeEqual(env.ORBIT_PRIORITIES_TOKEN, token))
      return new Response('Unauthorized', { status:401, headers:HEADERS });
    if (!env.PRIORITIES_DB)
      return new Response('Database unavailable', { status:503, headers:HEADERS });
    try {
      const state = await env.PRIORITIES_DB.prepare(
        "SELECT revision,updated_at FROM orbit_priority_sets WHERE scope='personal'"
      ).first();
      if (!state || !Number.isSafeInteger(state.revision) || state.revision < 0)
        return new Response('Uninitialized priority state', { status:503, headers:HEADERS });
      const query = await env.PRIORITIES_DB.prepare(
        "SELECT priority_id,title,done,position,updated_at FROM orbit_priorities WHERE scope='personal' AND deleted_at IS NULL ORDER BY position ASC,priority_id ASC LIMIT 101"
      ).all();
      const records = Array.isArray(query?.results) ? query.results : [];
      if (records.length > 100)
        return new Response('Too many priorities', { status:409, headers:HEADERS });
      const priorities = records.map(r => ({
        id: String(r.priority_id), title: String(r.title),
        done: r.done === 1, position: Number(r.position),
        updated_at: String(r.updated_at),
      }));
      return Response.json({
        source:'orbit-d1', revision:state.revision, updated_at:state.updated_at,
        priorities, has_more:false,
      }, { headers:HEADERS });
    } catch {
      // Error detail is not exposed to callers.
      return new Response('Priority read unavailable', { status:503, headers:HEADERS });
    }
  },
};

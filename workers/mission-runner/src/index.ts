type MissionPayload = {
  missionId: string;
  executionId: string;
  title: string;
  objective: string;
  steps: Array<{ id: string; title: string; agentId: string; toolIds: string[] }>;
};

type Queue = { send(message: MissionPayload, options?: { contentType?: 'json' }): Promise<void> };
type QueueMessage = { body: MissionPayload; ack(): void; retry(options?: { delaySeconds?: number }): void };
type QueueBatch = { messages: QueueMessage[] };

export interface Env {
  WORKER_API_TOKEN: string;
  EXECUTION_QUEUE?: Queue;
  RESEARCH_AGENT_URL?: string;
  RESEARCH_AGENT_TOKEN?: string;
  EXECUTION_CALLBACK_URL?: string;
  WORKER_CALLBACK_TOKEN?: string;
}

function jsonError(message: string, status: number) { return Response.json({ error: message }, { status }); }

function parseMission(value: unknown): MissionPayload | null {
  if (!value || typeof value !== 'object') return null;
  const mission = value as Partial<MissionPayload>;
  if (typeof mission.missionId !== 'string' || typeof mission.executionId !== 'string' || typeof mission.title !== 'string' || typeof mission.objective !== 'string' || !Array.isArray(mission.steps)) return null;
  return { missionId: mission.missionId, executionId: mission.executionId, title: mission.title, objective: mission.objective, steps: mission.steps.map((step) => ({ id: String(step?.id ?? ''), title: String(step?.title ?? ''), agentId: String(step?.agentId ?? ''), toolIds: Array.isArray(step?.toolIds) ? step.toolIds.map(String) : [] })) };
}

async function callback(env: Env, mission: MissionPayload, status: 'running' | 'completed' | 'failed', data: { output?: unknown; error?: string } = {}) {
  if (!env.EXECUTION_CALLBACK_URL || !env.WORKER_CALLBACK_TOKEN) throw new Error('Execution callback is not configured');
  const response = await fetch(env.EXECUTION_CALLBACK_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WORKER_CALLBACK_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ executionId: mission.executionId, missionId: mission.missionId, status, ...data }),
  });
  if (!response.ok) throw new Error(`Execution callback returned ${response.status}`);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return Response.json({ status: 'ok', service: 'forge-ai-mission-runner', queue: Boolean(env.EXECUTION_QUEUE), research: Boolean(env.RESEARCH_AGENT_URL && env.RESEARCH_AGENT_TOKEN), callback: Boolean(env.EXECUTION_CALLBACK_URL && env.WORKER_CALLBACK_TOKEN) });
    if (request.method !== 'POST') return jsonError('Method not allowed', 405);
    if (request.headers.get('Authorization') !== `Bearer ${env.WORKER_API_TOKEN}`) return jsonError('Unauthorized', 401);
    const mission = parseMission(await request.json().catch(() => null));
    if (!mission) return jsonError('Invalid mission payload', 400);
    if (!env.EXECUTION_QUEUE) return jsonError('Execution queue is not configured', 503);
    await env.EXECUTION_QUEUE.send(mission, { contentType: 'json' });
    return Response.json({ accepted: true, executionId: mission.executionId, status: 'queued', queuedAt: new Date().toISOString() }, { status: 202 });
  },

  async queue(batch: QueueBatch, env: Env) {
    for (const message of batch.messages) {
      try {
        if (!env.RESEARCH_AGENT_URL || !env.RESEARCH_AGENT_TOKEN) throw new Error('Research agent is not configured');
        await callback(env, message.body, 'running');
        const response = await fetch(env.RESEARCH_AGENT_URL, { method: 'POST', headers: { authorization: `Bearer ${env.RESEARCH_AGENT_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(message.body) });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof (result as { error?: unknown } | null)?.error === 'string' ? String((result as { error: string }).error) : `Research agent returned ${response.status}`);
        await callback(env, message.body, 'completed', { output: result });
        message.ack();
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Execution failed';
        try { await callback(env, message.body, 'failed', { error: messageText }); } catch { /* A callback outage is retried with the queue message. */ }
        message.retry({ delaySeconds: 60 });
      }
    }
  },
};

export default worker;

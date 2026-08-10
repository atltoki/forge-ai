type MissionPayload = {
  missionId: string;
  executionId: string;
  title: string;
  objective: string;
  steps: Array<{ id: string; title: string; agentId: string; toolIds: string[] }>;
};

type Queue = { send(message: MissionPayload): Promise<void> };
type QueueMessage = { body: MissionPayload; ack(): void; retry(): void };
type QueueBatch = { messages: QueueMessage[] };

export interface Env {
  WORKER_API_TOKEN: string;
  EXECUTION_QUEUE?: Queue;
  RESEARCH_AGENT_URL?: string;
  RESEARCH_AGENT_TOKEN?: string;
  EXECUTION_CALLBACK_URL?: string;
  WORKER_CALLBACK_TOKEN?: string;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseMission(value: unknown): MissionPayload | null {
  if (!value || typeof value !== 'object') return null;
  const mission = value as Partial<MissionPayload>;
  if (typeof mission.missionId !== 'string' || typeof mission.executionId !== 'string') return null;
  if (typeof mission.title !== 'string' || typeof mission.objective !== 'string' || !Array.isArray(mission.steps)) return null;
  return {
    missionId: mission.missionId,
    executionId: mission.executionId,
    title: mission.title,
    objective: mission.objective,
    steps: mission.steps.map((step) => ({ id: String(step?.id ?? ''), title: String(step?.title ?? ''), agentId: String(step?.agentId ?? ''), toolIds: Array.isArray(step?.toolIds) ? step.toolIds.map(String) : [] })),
  };
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return jsonError('Method not allowed', 405);
    if (request.headers.get('Authorization') !== `Bearer ${env.WORKER_API_TOKEN}`) return jsonError('Unauthorized', 401);
    const mission = parseMission(await request.json().catch(() => null));
    if (!mission) return jsonError('Invalid mission payload', 400);
    if (!env.EXECUTION_QUEUE) return jsonError('Execution queue is not configured', 503);
    await env.EXECUTION_QUEUE.send(mission);
    return Response.json({ accepted: true, executionId: mission.executionId, status: 'queued', queuedAt: new Date().toISOString() }, { status: 202 });
  },

  async queue(batch: QueueBatch, env: Env) {
    for (const message of batch.messages) {
      try {
        if (!env.RESEARCH_AGENT_URL || !env.EXECUTION_CALLBACK_URL || !env.WORKER_CALLBACK_TOKEN) throw new Error('Research agent or execution callback is not configured');
        const response = await fetch(env.RESEARCH_AGENT_URL, {
          method: 'POST',
          headers: { authorization: env.RESEARCH_AGENT_TOKEN ? `Bearer ${env.RESEARCH_AGENT_TOKEN}` : '', 'content-type': 'application/json' },
          body: JSON.stringify(message.body),
        });
        if (!response.ok) throw new Error(`Research agent returned ${response.status}`);
        const result = await response.json();
        await fetch(env.EXECUTION_CALLBACK_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${env.WORKER_CALLBACK_TOKEN}`, 'content-type': 'application/json' },
          body: JSON.stringify({ executionId: message.body.executionId, missionId: message.body.missionId, status: 'completed', output: result }),
        });
        message.ack();
      } catch (error) {
        if (env.EXECUTION_CALLBACK_URL && env.WORKER_CALLBACK_TOKEN) {
          await fetch(env.EXECUTION_CALLBACK_URL, {
            method: 'POST',
            headers: { authorization: `Bearer ${env.WORKER_CALLBACK_TOKEN}`, 'content-type': 'application/json' },
            body: JSON.stringify({ executionId: message.body.executionId, missionId: message.body.missionId, status: 'failed', error: error instanceof Error ? error.message : 'Execution failed' }),
          });
        }
        message.retry();
      }
    }
  },
};

export default worker;

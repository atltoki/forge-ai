import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const expectedToken = process.env.RESEARCH_AGENT_TOKEN;
  if (!expectedToken || request.headers.get('authorization') !== `Bearer ${expectedToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OpenAI research provider is not configured' }, { status: 503 });
  const body = await request.json().catch(() => null) as { objective?: unknown; title?: unknown } | null;
  if (typeof body?.objective !== 'string' || body.objective.trim().length < 10) return NextResponse.json({ error: 'A research objective of at least 10 characters is required' }, { status: 400 });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_RESEARCH_MODEL ?? 'gpt-4.1-mini', tools: [{ type: 'web_search_preview' }], input: [{ role: 'system', content: 'You are FORGE AI Research Agent for ATLYN. Research only public, verifiable business information. Never invent companies, contacts, employee counts, or sources. If a field cannot be verified, say unknown. Return concise, actionable prospect research.' }, { role: 'user', content: `${String(body.title ?? 'Prospecting mission')}\n\nObjective:\n${body.objective}` }], store: false }),
  });
  if (!response.ok) return NextResponse.json({ error: `Research provider returned ${response.status}` }, { status: 502 });
  const payload = await response.json() as { output_text?: string };
  if (!payload.output_text) return NextResponse.json({ error: 'Research provider returned no output' }, { status: 502 });
  try { return NextResponse.json(JSON.parse(payload.output_text)); } catch { return NextResponse.json({ result: payload.output_text }); }
}

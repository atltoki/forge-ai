import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type OutputAnnotation = { type?: string; url?: string; title?: string };
type ResponseContent = { type?: string; text?: string; annotations?: OutputAnnotation[] };
type ResponseItem = { type?: string; content?: ResponseContent[] };
type OpenAIResponse = { output?: ResponseItem[]; error?: { message?: string } };

function extractResearch(payload: OpenAIResponse) {
  const contents = (payload.output ?? []).filter((item) => item.type === 'message').flatMap((item) => item.content ?? []).filter((content) => content.type === 'output_text');
  const result = contents.map((content) => content.text ?? '').filter(Boolean).join('\n\n').trim();
  const sources = contents.flatMap((content) => content.annotations ?? []).filter((annotation) => annotation.type === 'url_citation' && annotation.url).map((annotation) => ({ title: annotation.title ?? annotation.url!, url: annotation.url! }));
  return { result, sources: [...new Map(sources.map((source) => [source.url, source])).values()] };
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.RESEARCH_AGENT_TOKEN;
  if (!expectedToken || request.headers.get('authorization') !== `Bearer ${expectedToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI research provider is not configured' }, { status: 503 });

  const body = await request.json().catch(() => null) as { executionId?: unknown; objective?: unknown; title?: unknown } | null;
  if (typeof body?.executionId !== 'string' || typeof body.objective !== 'string' || body.objective.trim().length < 10) return NextResponse.json({ error: 'A valid execution and research objective are required' }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data: existing } = await admin.from('executions').select('status,output').eq('id', body.executionId).maybeSingle();
    if (existing?.status === 'completed' && existing.output && Object.keys(existing.output).length) return NextResponse.json(existing.output);
  }

  const configuredModel = process.env.OPENAI_RESEARCH_MODEL ?? 'gpt-5.6-luna';
  const model = configuredModel.startsWith('gpt-4.1') ? 'gpt-5.6-luna' : configuredModel;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search' }],
      input: [
        { role: 'system', content: 'Tu es Atlas, l’agent de recherche de FORGE AI pour ATLYN. Recherche uniquement des informations professionnelles publiques et vérifiables. Ne fabrique jamais une entreprise, un contact ou une donnée. Réponds en français avec une liste directement exploitable. Pour chaque prospect demandé, donne au minimum le nom, le site officiel, la localisation, l’activité, les éléments de qualification disponibles et les sources. Signale clairement les informations introuvables.' },
        { role: 'user', content: `${String(body.title ?? 'Mission de prospection')}\n\nObjectif :\n${body.objective}` },
      ],
      store: false,
    }),
  });
  const payload = await response.json().catch(() => ({})) as OpenAIResponse;
  if (!response.ok) return NextResponse.json({ error: payload.error?.message ? `OpenAI: ${payload.error.message}` : `Research provider returned ${response.status}` }, { status: 502 });

  const extracted = extractResearch(payload);
  if (!extracted.result) return NextResponse.json({ error: 'Research provider returned no text result' }, { status: 502 });
  return NextResponse.json({ ...extracted, model, generatedAt: new Date().toISOString() });
}

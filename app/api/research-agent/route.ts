import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type Source = { title: string; url: string };
type ResearchResult = { result: string; sources: Source[]; model: string; provider: 'gemini' | 'openai'; searchProvider?: 'tavily' };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
  error?: { message?: string };
};

type TavilyResult = { title?: string; url?: string; content?: string; score?: number };
type TavilyResponse = { results?: TavilyResult[]; detail?: { error?: string } | string };

type OutputAnnotation = { type?: string; url?: string; title?: string };
type ResponseContent = { type?: string; text?: string; annotations?: OutputAnnotation[] };
type ResponseItem = { type?: string; content?: ResponseContent[] };
type OpenAIResponse = { output?: ResponseItem[]; error?: { message?: string } };

const SYSTEM_PROMPT = 'Tu es Atlas, l’agent de recherche de FORGE AI pour ATLYN. Recherche uniquement des informations professionnelles publiques et vérifiables. Ne fabrique jamais une entreprise, un contact ou une donnée. Réponds en français avec une liste directement exploitable. Commence par un résumé très court. Pour chaque prospect, utilise exactement un titre Markdown de niveau 2 sous la forme « ## Nom de l’entreprise », puis une ligne par champ : « Site : », « Ville : », « Activité : » et « Qualification : ». Ajoute uniquement les informations vérifiées et signale clairement celles qui sont introuvables.';

function uniqueSources(sources: Source[]) {
  return [...new Map(sources.filter((source) => source.url).map((source) => [source.url, source])).values()];
}

async function searchWithTavily(title: string, objective: string) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) throw new Error('Tavily web search is not configured');

  const objectiveExcerpt = objective.replace(/\s+/g, ' ').trim().slice(0, 320);
  const queries = [
    `${title}: ${objectiveExcerpt}`.slice(0, 390),
    `${objectiveExcerpt} annuaire professionnel sites officiels entreprises`.slice(0, 390),
  ];

  const responses = await Promise.all(queries.map(async (query) => {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, topic: 'general', search_depth: 'basic', max_results: 20, include_answer: false, include_raw_content: false }),
    });
    const payload = await response.json().catch(() => ({})) as TavilyResponse;
    if (!response.ok) {
      const detail = typeof payload.detail === 'string' ? payload.detail : payload.detail?.error;
      throw new Error(detail ? `Tavily: ${detail}` : `Tavily returned ${response.status}`);
    }
    return payload.results ?? [];
  }));

  return [...new Map(responses.flat().filter((item) => item.url).map((item) => [item.url!, item])).values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 30);
}

async function runGemini(title: string, objective: string): Promise<ResearchResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Gemini research provider is not configured');
  const model = process.env.GEMINI_RESEARCH_MODEL?.trim() || 'gemini-3.1-flash-lite';
  const searchResults = await searchWithTavily(title, objective);
  if (!searchResults.length) throw new Error('Tavily returned no web results');

  const sources = uniqueSources(searchResults.map((item) => ({ title: item.title ?? item.url!, url: item.url! })));
  const webContext = searchResults.map((item, index) => [
    `[Source ${index + 1}]`,
    `Titre : ${item.title ?? 'Sans titre'}`,
    `URL : ${item.url}`,
    `Extrait : ${item.content ?? 'Aucun extrait'}`,
  ].join('\n')).join('\n\n');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `${title}\n\nObjectif :\n${objective}\n\nRésultats de recherche web publics :\n${webContext}\n\nUtilise exclusivement ces résultats. Ne cite aucun prospect absent des sources. Dans le champ « Site : », reprends l’URL vérifiée correspondante.` }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const payload = await response.json().catch(() => ({})) as GeminiResponse;
  if (!response.ok) throw new Error(payload.error?.message ? `Gemini: ${payload.error.message}` : `Gemini returned ${response.status}`);

  const candidate = payload.candidates?.[0];
  const result = candidate?.content?.parts?.map((part) => part.text ?? '').filter(Boolean).join('\n\n').trim() ?? '';
  if (!result) throw new Error('Gemini returned no text result');
  return { result, sources, model, provider: 'gemini', searchProvider: 'tavily' };
}

async function runOpenAI(title: string, objective: string): Promise<ResearchResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OpenAI research provider is not configured');
  const model = process.env.OPENAI_RESEARCH_MODEL?.trim() || 'gpt-5.6-luna';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search' }],
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${title}\n\nObjectif :\n${objective}` },
      ],
      store: false,
    }),
  });
  const payload = await response.json().catch(() => ({})) as OpenAIResponse;
  if (!response.ok) throw new Error(payload.error?.message ? `OpenAI: ${payload.error.message}` : `OpenAI returned ${response.status}`);

  const contents = (payload.output ?? []).filter((item) => item.type === 'message').flatMap((item) => item.content ?? []).filter((content) => content.type === 'output_text');
  const result = contents.map((content) => content.text ?? '').filter(Boolean).join('\n\n').trim();
  const sources = uniqueSources(contents.flatMap((content) => content.annotations ?? []).filter((annotation) => annotation.type === 'url_citation' && annotation.url).map((annotation) => ({ title: annotation.title ?? annotation.url!, url: annotation.url! })));
  if (!result) throw new Error('OpenAI returned no text result');
  return { result, sources, model, provider: 'openai' };
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.RESEARCH_AGENT_TOKEN;
  if (!expectedToken || request.headers.get('authorization') !== `Bearer ${expectedToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'No research provider is configured' }, { status: 503 });
  if (process.env.GEMINI_API_KEY && !process.env.TAVILY_API_KEY) return NextResponse.json({ error: 'Tavily web search is not configured' }, { status: 503 });

  const body = await request.json().catch(() => null) as { executionId?: unknown; objective?: unknown; title?: unknown } | null;
  if (typeof body?.executionId !== 'string' || typeof body.objective !== 'string' || body.objective.trim().length < 10) return NextResponse.json({ error: 'A valid execution and research objective are required' }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data: existing } = await admin.from('executions').select('status,output').eq('id', body.executionId).maybeSingle();
    if (existing?.status === 'completed' && existing.output && Object.keys(existing.output).length) return NextResponse.json(existing.output);
  }

  try {
    const title = String(body.title ?? 'Mission de prospection');
    const research = process.env.GEMINI_API_KEY ? await runGemini(title, body.objective) : await runOpenAI(title, body.objective);
    return NextResponse.json({ ...research, generatedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Research provider failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

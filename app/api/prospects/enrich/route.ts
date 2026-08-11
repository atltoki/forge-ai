import { NextRequest, NextResponse } from 'next/server';
import { extractPublicContact } from '@/lib/domain/prospects';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type TavilyResult = { title?: string; url?: string; content?: string };
type TavilyResponse = { results?: TavilyResult[]; detail?: { error?: string } | string };

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'La recherche de contacts n’est pas configurée.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { prospectId?: unknown } | null;
  if (typeof body?.prospectId !== 'string') return NextResponse.json({ error: 'Prospect identifier is required' }, { status: 400 });

  const { data: prospect, error: prospectError } = await supabase.from('prospects').select('*').eq('id', body.prospectId).eq('user_id', user.id).single();
  if (prospectError || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const domain = (() => { try { return new URL(prospect.website).hostname; } catch { return ''; } })();
  const query = [`${prospect.company_name} contact professionnel email téléphone Portugal`, domain ? `site:${domain}` : ''].filter(Boolean).join(' ');
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, topic: 'general', search_depth: 'advanced', max_results: 10, include_answer: false, include_raw_content: false }),
  });
  const payload = await response.json().catch(() => ({})) as TavilyResponse;
  if (!response.ok) {
    const detail = typeof payload.detail === 'string' ? payload.detail : payload.detail?.error;
    return NextResponse.json({ error: detail ? `Tavily: ${detail}` : 'Recherche de contact impossible' }, { status: 502 });
  }

  const contact = extractPublicContact(payload.results ?? [], prospect.website);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (!prospect.email && contact.email) updates.email = contact.email;
  if (!prospect.phone && contact.phone) updates.phone = contact.phone;
  if (!prospect.linkedin_url && contact.linkedinUrl) updates.linkedin_url = contact.linkedinUrl;
  if (contact.sourceUrl) updates.source_url = contact.sourceUrl;
  if (Object.keys(updates).length === 1) return NextResponse.json({ data: prospect, found: false });

  const { data, error } = await supabase.from('prospects').update(updates).eq('id', prospect.id).eq('user_id', user.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('logs').insert({ user_id: user.id, mission_id: prospect.mission_id, level: 'info', source: 'ATLYN Enrichment', message: `Coordonnées publiques enrichies pour « ${prospect.company_name} ».` });
  return NextResponse.json({ data, found: true });
}

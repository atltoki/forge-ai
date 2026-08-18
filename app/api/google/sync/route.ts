import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleAccess, googleJson } from '@/lib/google/client';

type Service = 'gmail' | 'calendar' | 'drive';
type Insight = { service: Service; title: string; summary: string; count: number; metadata: Record<string, unknown> };

function header(headers: Array<{ name?: string; value?: string }> = [], name: string) { return headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? ''; }

async function gmailInsight(token: string): Promise<Insight> {
  const list = await googleJson<{ messages?: Array<{ id: string }>; resultSizeEstimate?: number }>('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12&q=is%3Aunread%20newer_than%3A14d', token);
  const messages = await Promise.all((list.messages ?? []).slice(0, 8).map((item) => googleJson<{ snippet?: string; payload?: { headers?: Array<{ name?: string; value?: string }> } }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, token)));
  const items = messages.map((message) => ({ from: header(message.payload?.headers, 'From'), subject: header(message.payload?.headers, 'Subject') || '(sans objet)', date: header(message.payload?.headers, 'Date'), snippet: message.snippet ?? '' }));
  return { service: 'gmail', title: 'Signaux récents de Gmail', summary: items.length ? items.map((item) => `• ${item.subject} — ${item.from}`).join('\n') : 'Aucun message non lu récent.', count: list.resultSizeEstimate ?? items.length, metadata: { items, synced_at: new Date().toISOString(), source: 'google' } };
}

async function calendarInsight(token: string): Promise<Insight> {
  const start = new Date(); const end = new Date(Date.now() + 7 * 86400000);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=10&timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}`;
  const data = await googleJson<{ items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string }; attendees?: unknown[]; location?: string }> }>(url, token);
  const items = (data.items ?? []).map((event) => ({ id: event.id, title: event.summary ?? 'Rendez-vous', start: event.start?.dateTime ?? event.start?.date ?? '', attendees: event.attendees?.length ?? 0, location: event.location ?? '' }));
  return { service: 'calendar', title: 'Agenda des 7 prochains jours', summary: items.length ? items.map((item) => `• ${item.title} — ${item.start}`).join('\n') : 'Aucun rendez-vous prévu dans les 7 prochains jours.', count: items.length, metadata: { items, synced_at: new Date().toISOString(), source: 'google' } };
}

async function driveInsight(token: string): Promise<Insight> {
  const url = 'https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName))&q=trashed%3Dfalse';
  const data = await googleJson<{ files?: Array<{ id: string; name?: string; mimeType?: string; modifiedTime?: string; webViewLink?: string }> }>(url, token);
  const items = (data.files ?? []).map((file) => ({ id: file.id, name: file.name ?? 'Fichier', type: file.mimeType ?? '', modified: file.modifiedTime ?? '', link: file.webViewLink ?? '' }));
  return { service: 'drive', title: 'Documents Drive récemment modifiés', summary: items.length ? items.slice(0, 12).map((item) => `• ${item.name} — ${item.modified}`).join('\n') : 'Aucun document récent détecté.', count: items.length, metadata: { items, synced_at: new Date().toISOString(), source: 'google' } };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase indisponible' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { service?: Service | 'all' };
  const selected: Service[] = body.service && body.service !== 'all' ? [body.service] : ['gmail', 'calendar', 'drive'];
  if (selected.some((service) => !['gmail', 'calendar', 'drive'].includes(service))) return NextResponse.json({ error: 'Service Google inconnu' }, { status: 400 });

  try {
    const { token, admin } = await getGoogleAccess(user.id, request.nextUrl.origin);
    const jobs: Record<Service, () => Promise<Insight>> = { gmail: () => gmailInsight(token), calendar: () => calendarInsight(token), drive: () => driveInsight(token) };
    const results = await Promise.allSettled(selected.map((service) => jobs[service]()));
    const insights = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const errors = results.flatMap((result, index) => result.status === 'rejected' ? [{ service: selected[index], message: result.reason instanceof Error ? result.reason.message : 'Synchronisation impossible' }] : []);
    if (insights.length) {
      await admin.from('memory').delete().eq('user_id', user.id).eq('collection', 'google-live');
      await admin.from('memory').insert(insights.map((insight) => ({ user_id: user.id, title: insight.title, collection: 'google-live', content: insight.summary, metadata: { ...insight.metadata, service: insight.service, count: insight.count } })));
      await admin.from('logs').insert({ user_id: user.id, level: errors.length ? 'warning' : 'info', source: 'Google Intelligence', message: `${insights.length} source${insights.length > 1 ? 's' : ''} Google synchronisée${insights.length > 1 ? 's' : ''}.`, metadata: { services: insights.map((item) => item.service), errors } });
    }
    return NextResponse.json({ synced: insights.length, insights, errors });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Synchronisation Google impossible' }, { status: 500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { parseProspects, prospectStatuses } from '@/lib/domain/prospects';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const context = await authenticatedClient();
  if ('error' in context) return context.error;
  const { data, error } = await context.supabase.from('prospects').select('*, missions(title)').eq('user_id', context.user.id).order('score', { ascending: false }).order('created_at', { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const context = await authenticatedClient();
  if ('error' in context) return context.error;
  const body = await request.json().catch(() => ({})) as { missionId?: string };
  let query = context.supabase.from('missions').select('id,title,objective,result').eq('user_id', context.user.id).eq('status', 'completed');
  if (body.missionId) query = query.eq('id', body.missionId);
  const { data: missions, error: missionError } = await query;
  if (missionError) return NextResponse.json({ error: missionError.message }, { status: 500 });

  const records = (missions ?? []).flatMap((mission) => {
    const result = mission.result as { result?: unknown; sources?: Array<{ url?: string }> } | null;
    if (typeof result?.result !== 'string') return [];
    return parseProspects(result.result, result.sources, mission.objective).map((prospect) => ({
      user_id: context.user.id,
      mission_id: mission.id,
      company_name: prospect.companyName,
      website: prospect.website,
      city: prospect.city,
      activity: prospect.activity,
      qualification: prospect.qualification,
      contact_name: prospect.contactName,
      email: prospect.email,
      phone: prospect.phone,
      linkedin_url: prospect.linkedinUrl,
      source_url: prospect.sourceUrl,
      score: prospect.score,
      status: prospect.score >= 70 ? 'qualified' : 'new',
      updated_at: new Date().toISOString(),
    }));
  });

  if (!records.length) return NextResponse.json({ imported: 0 });
  const { data: existing } = await context.supabase.from('prospects').select('mission_id,company_name,status,notes,follow_up_at').eq('user_id', context.user.id);
  const existingMap = new Map((existing ?? []).map((prospect) => [`${prospect.mission_id}:${prospect.company_name}`, prospect]));
  const merged = records.map((record) => {
    const previous = existingMap.get(`${record.mission_id}:${record.company_name}`);
    const progressed = previous && ['contacted', 'interested', 'won', 'archived'].includes(previous.status);
    return { ...record, status: progressed ? previous.status : record.status, notes: previous?.notes ?? '', follow_up_at: previous?.follow_up_at ?? null };
  });
  const { data, error } = await context.supabase.from('prospects').upsert(merged, { onConflict: 'user_id,mission_id,company_name', ignoreDuplicates: false }).select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await context.supabase.from('logs').insert({ user_id: context.user.id, level: 'info', source: 'ATLYN Pipeline', message: `${data.length} prospect${data.length > 1 ? 's' : ''} synchronisé${data.length > 1 ? 's' : ''}.` });
  return NextResponse.json({ imported: data.length, data });
}

export async function PATCH(request: NextRequest) {
  const context = await authenticatedClient();
  if ('error' in context) return context.error;
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown; notes?: unknown; followUpAt?: unknown } | null;
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Prospect identifier is required' }, { status: 400 });
  if (body.status !== undefined && (typeof body.status !== 'string' || !prospectStatuses.includes(body.status as never))) return NextResponse.json({ error: 'Invalid prospect status' }, { status: 400 });
  if (body.notes !== undefined && typeof body.notes !== 'string') return NextResponse.json({ error: 'Invalid notes' }, { status: 400 });
  if (body.followUpAt !== undefined && body.followUpAt !== null && typeof body.followUpAt !== 'string') return NextResponse.json({ error: 'Invalid follow-up date' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes.trim().slice(0, 4000);
  if (body.followUpAt !== undefined) updates.follow_up_at = body.followUpAt || null;
  const { data, error } = await context.supabase.from('prospects').update(updates).eq('id', body.id).eq('user_id', context.user.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await context.supabase.from('logs').insert({ user_id: context.user.id, mission_id: data.mission_id, level: 'info', source: 'ATLYN Pipeline', message: `Prospect « ${data.company_name} » mis à jour : ${data.status}.` });
  return NextResponse.json({ data });
}

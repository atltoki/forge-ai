import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listMissions, planMission } from '@/lib/engines/mission-engine';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) return NextResponse.json({ source: 'engine', data: listMissions() });

  const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false });

  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ source: 'supabase', data });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.objective) {
    return NextResponse.json({ error: 'title and objective are required' }, { status: 400 });
  }

  const plan = planMission({
    title: String(body.title),
    objective: String(body.objective),
    preferredAgentId: body.preferredAgentId ? String(body.preferredAgentId) : undefined,
  });

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ source: 'engine', data: plan }, { status: 201 });
  }

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('missions')
    .insert({
      user_id: user.id,
      title: plan.title,
      objective: plan.objective,
      status: plan.blockedTools.length ? 'planning' : 'queued',
      progress: 0,
      result: { plan },
    })
    .select('*')
    .single();

  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ source: 'supabase', data }, { status: 201 });
}

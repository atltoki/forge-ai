import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listMissions, planMission } from '@/lib/engines/mission-engine';

async function dispatchToWorker(payload: Record<string, unknown>) {
  const workerUrl = process.env.WORKER_API_URL;
  const workerToken = process.env.WORKER_API_TOKEN;
  if (!workerUrl || !workerToken) return { configured: false as const, dispatched: false as const };
  try {
    const response = await fetch(workerUrl, { method: 'POST', headers: { authorization: `Bearer ${workerToken}`, 'content-type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    if (!response.ok) return { configured: true as const, dispatched: false as const, reason: `Worker returned ${response.status}` };
    return { configured: true as const, dispatched: true as const };
  } catch (error) {
    return { configured: true as const, dispatched: false as const, reason: error instanceof Error ? error.message : 'Worker dispatch failed' };
  }
}

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: execution, error: executionError } = await supabase
    .from('executions')
    .insert({ user_id: user.id, mission_id: data.id, status: plan.blockedTools.length ? 'failed' : 'queued', input: { plan } })
    .select('*')
    .single();
  if (executionError) return NextResponse.json({ error: executionError.message }, { status: 500 });

  if (!plan.blockedTools.length) {
    const dispatch = await dispatchToWorker({ missionId: data.id, executionId: execution.id, title: plan.title, objective: plan.objective, steps: plan.steps });
    if (dispatch.configured && !dispatch.dispatched) {
      await supabase.from('executions').update({ status: 'failed', error: dispatch.reason }).eq('id', execution.id).eq('user_id', user.id);
      return NextResponse.json({ source: 'supabase', data, execution: { ...execution, status: 'failed', error: dispatch.reason }, plan, warning: dispatch.reason }, { status: 201 });
    }
  }

  return NextResponse.json({ source: 'supabase', data, execution, plan }, { status: 201 });
}

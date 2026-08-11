import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { planMission } from '@/lib/engines/mission-engine';

async function dispatchToWorker(payload: Record<string, unknown>) {
  const workerUrl = process.env.WORKER_API_URL;
  const workerToken = process.env.WORKER_API_TOKEN;
  if (!workerUrl || !workerToken) return { dispatched: false as const, reason: 'Cloudflare Worker is not configured' };

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${workerToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) return { dispatched: false as const, reason: body?.error ?? `Worker returned ${response.status}` };
    return { dispatched: true as const };
  } catch (error) {
    return { dispatched: false as const, reason: error instanceof Error ? error.message : 'Worker dispatch failed' };
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data, error } = await supabase
    .from('missions')
    .select('*, executions(id,status,output,error,started_at,completed_at,created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'executions', ascending: false });

  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ source: 'supabase', data });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.objective) return NextResponse.json({ error: 'Le titre et l’objectif sont obligatoires.' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const plan = planMission({ title: String(body.title).trim(), objective: String(body.objective).trim(), preferredAgentId: body.preferredAgentId ? String(body.preferredAgentId) : undefined });
  const { data: mission, error: missionError } = await supabase.from('missions').insert({
    user_id: user.id,
    title: plan.title,
    objective: plan.objective,
    status: 'queued',
    progress: 0,
    result: { plan },
  }).select('*').single();
  if (missionError) return NextResponse.json({ error: missionError.message }, { status: 500 });

  const { data: execution, error: executionError } = await supabase.from('executions').insert({
    user_id: user.id,
    mission_id: mission.id,
    status: 'queued',
    input: { plan },
  }).select('*').single();
  if (executionError) {
    await supabase.from('missions').update({ status: 'failed', result: { error: executionError.message } }).eq('id', mission.id).eq('user_id', user.id);
    return NextResponse.json({ error: executionError.message }, { status: 500 });
  }

  await supabase.from('logs').insert({ user_id: user.id, mission_id: mission.id, level: 'info', source: 'Mission Engine', message: `Mission « ${plan.title} » créée et mise en file d’attente.` });
  const dispatch = await dispatchToWorker({ missionId: mission.id, executionId: execution.id, title: plan.title, objective: plan.objective, steps: plan.steps });

  if (!dispatch.dispatched) {
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('executions').update({ status: 'failed', error: dispatch.reason, completed_at: now }).eq('id', execution.id).eq('user_id', user.id),
      supabase.from('missions').update({ status: 'failed', progress: 0, result: { error: dispatch.reason }, updated_at: now }).eq('id', mission.id).eq('user_id', user.id),
      supabase.from('logs').insert({ user_id: user.id, mission_id: mission.id, level: 'error', source: 'Mission Runner', message: dispatch.reason }),
    ]);
    return NextResponse.json({ source: 'supabase', data: { ...mission, status: 'failed', result: { error: dispatch.reason }, executions: [{ ...execution, status: 'failed', error: dispatch.reason }] }, warning: dispatch.reason }, { status: 201 });
  }

  return NextResponse.json({ source: 'supabase', data: { ...mission, executions: [execution] }, plan }, { status: 201 });
}

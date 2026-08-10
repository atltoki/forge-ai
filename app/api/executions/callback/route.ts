import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const statuses = new Set(['completed', 'failed']);

export async function POST(request: NextRequest) {
  const expectedToken = process.env.WORKER_CALLBACK_TOKEN;
  if (!expectedToken || request.headers.get('authorization') !== `Bearer ${expectedToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { executionId?: unknown; missionId?: unknown; status?: unknown; output?: unknown; error?: unknown } | null;
  if (typeof body?.executionId !== 'string' || typeof body.missionId !== 'string' || typeof body.status !== 'string' || !statuses.has(body.status)) return NextResponse.json({ error: 'Invalid execution callback' }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase service role is not configured' }, { status: 503 });
  const now = new Date().toISOString();
  const executionUpdate = body.status === 'completed' ? { status: 'completed', output: body.output ?? {}, completed_at: now, error: null } : { status: 'failed', error: typeof body.error === 'string' ? body.error : 'Execution failed', completed_at: now };
  const { error: executionError } = await supabase.from('executions').update(executionUpdate).eq('id', body.executionId).eq('mission_id', body.missionId);
  if (executionError) return NextResponse.json({ error: executionError.message }, { status: 500 });
  const { error: missionError } = await supabase.from('missions').update({ status: body.status, progress: body.status === 'completed' ? 100 : 0, updated_at: now, result: body.output ?? { error: body.error } }).eq('id', body.missionId);
  if (missionError) return NextResponse.json({ error: missionError.message }, { status: 500 });
  return NextResponse.json({ ok: true, executionId: body.executionId, status: body.status });
}

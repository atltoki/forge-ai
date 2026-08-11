import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseProspects } from '@/lib/domain/prospects';

const statuses = new Set(['running', 'completed', 'failed']);

export async function POST(request: NextRequest) {
  const expectedToken = process.env.WORKER_CALLBACK_TOKEN;
  if (!expectedToken || request.headers.get('authorization') !== `Bearer ${expectedToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { executionId?: unknown; missionId?: unknown; status?: unknown; output?: unknown; error?: unknown } | null;
  if (typeof body?.executionId !== 'string' || typeof body.missionId !== 'string' || typeof body.status !== 'string' || !statuses.has(body.status)) return NextResponse.json({ error: 'Invalid execution callback' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase service role is not configured' }, { status: 503 });
  const { data: execution, error: lookupError } = await supabase.from('executions').select('id,user_id,status,output').eq('id', body.executionId).eq('mission_id', body.missionId).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!execution) return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
  if (execution.status === 'completed' && body.status === 'completed') return NextResponse.json({ ok: true, idempotent: true });

  const now = new Date().toISOString();
  const isRunning = body.status === 'running';
  const isCompleted = body.status === 'completed';
  const errorMessage = typeof body.error === 'string' ? body.error : 'Execution failed';
  const executionUpdate = isRunning
    ? { status: 'running', started_at: now, error: null }
    : isCompleted
      ? { status: 'completed', output: body.output ?? {}, completed_at: now, error: null }
      : { status: 'failed', error: errorMessage, completed_at: now };
  const missionUpdate = isRunning
    ? { status: 'running', progress: 20, updated_at: now }
    : isCompleted
      ? { status: 'completed', progress: 100, updated_at: now, result: body.output ?? {} }
      : { status: 'failed', progress: 0, updated_at: now, result: { error: errorMessage } };

  const { error: executionError } = await supabase.from('executions').update(executionUpdate).eq('id', body.executionId).eq('mission_id', body.missionId);
  if (executionError) return NextResponse.json({ error: executionError.message }, { status: 500 });
  const { data: mission, error: missionError } = await supabase.from('missions').update(missionUpdate).eq('id', body.missionId).eq('user_id', execution.user_id).select('title,objective').single();
  if (missionError) return NextResponse.json({ error: missionError.message }, { status: 500 });

  const level = body.status === 'failed' ? 'error' : 'info';
  const message = isRunning ? `Mission « ${mission.title} » en cours d’exécution.` : isCompleted ? `Mission « ${mission.title} » terminée avec succès.` : `Mission « ${mission.title} » échouée : ${errorMessage}`;
  await supabase.from('logs').insert({ user_id: execution.user_id, mission_id: body.missionId, level, source: 'Mission Runner', message, metadata: { execution_id: body.executionId } });

  if (isCompleted) {
    const content = typeof (body.output as { result?: unknown } | null)?.result === 'string' ? String((body.output as { result: string }).result) : JSON.stringify(body.output ?? {});
    const { data: existingMemory } = await supabase.from('memory').select('id').eq('user_id', execution.user_id).eq('mission_id', body.missionId).eq('collection', 'Mission results').maybeSingle();
    if (existingMemory) await supabase.from('memory').update({ title: mission.title, content, metadata: body.output ?? {}, updated_at: now }).eq('id', existingMemory.id);
    else await supabase.from('memory').insert({ user_id: execution.user_id, mission_id: body.missionId, title: mission.title, collection: 'Mission results', content, metadata: body.output ?? {} });

    const output = body.output as { result?: unknown; sources?: Array<{ url?: string }> } | null;
    if (typeof output?.result === 'string') {
      const prospects = parseProspects(output.result, output.sources, mission.objective).map((prospect) => ({
        user_id: execution.user_id,
        mission_id: body.missionId,
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
        updated_at: now,
      }));
      if (prospects.length) await supabase.from('prospects').upsert(prospects, { onConflict: 'user_id,mission_id,company_name', ignoreDuplicates: true });
    }
  }

  return NextResponse.json({ ok: true, executionId: body.executionId, status: body.status });
}

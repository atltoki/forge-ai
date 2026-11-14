import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { proposeCycle, type DirectorProject, type Stage } from '@/lib/director/core';

export const dynamic = 'force-dynamic';

const starterProjects = [
  { slug: 'locksability', name: 'Locksability' },
  { slug: 'atl-frontdesk', name: 'ATL Frontdesk' },
  { slug: 'forge-ai', name: 'Forge AI' },
  { slug: 'quad-unlimited', name: 'Quad Unlimited' },
  { slug: 'bali-tracker', name: 'Bali Tracker' },
];
// These entries are unverified hypotheses, NOT current project audits or live metrics.
const validStages: Stage[] = ['unverified', 'idea', 'building', 'live', 'paused'];
const metricFields = ['revenue_potential', 'urgency', 'alignment', 'evidence', 'effort', 'risk'] as const;
type MetricField = typeof metricFields[number];

async function session() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentification requise' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const auth = await session();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  const [projectsResult, proposalsResult, cyclesResult] = await Promise.all([
    supabase.from('director_projects').select('*').eq('user_id', user.id).order('name'),
    supabase.from('director_proposals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('director_cycles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ]);
  const error = projectsResult.error || proposalsResult.error || cyclesResult.error;
  if (error) return NextResponse.json({ error: error.message, hint: 'Appliquer la migration 20261113_atl_director.sql' }, { status: 500 });
  return NextResponse.json({
    projects: projectsResult.data ?? [],
    proposals: proposalsResult.data ?? [],
    cycles: cyclesResult.data ?? [],
    execution_enabled: false,
    mode: 'planning_only',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await session();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  if (body.action === 'bootstrap') {
    const { error } = await supabase.from('director_projects').upsert(
      starterProjects.map((project) => ({
        ...project, user_id: user.id, stage: 'unverified',
        revenue_potential: 2, urgency: 2, alignment: 2,
        evidence: 0, effort: 2, risk: 2,
      })),
      { onConflict: 'user_id,slug', ignoreDuplicates: true },
    );
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ initialized: true, verified: false });
  }

  if (body.action === 'update_project') {
    if (typeof body.project_id !== 'string' || !body.project_id) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 });
    const fields = body.fields;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return NextResponse.json({ error: 'Valeurs invalides' }, { status: 400 });
    const update: Record<string, number | string> = {};
    for (const field of metricFields) {
      if (Object.prototype.hasOwnProperty.call(fields, field)) {
        const value = fields[field as MetricField];
        if (!Number.isInteger(value) || value < 0 || value > 5) return NextResponse.json({ error: `Note invalide : ${field}` }, { status: 400 });
        update[field] = value;
      }
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'stage')) {
      if (!validStages.includes(fields.stage)) return NextResponse.json({ error: 'Étape invalide' }, { status: 400 });
      update.stage = fields.stage;
    }
    if (Object.keys(update).length === 0 || Object.keys(fields).some((key) => key !== 'stage' && !metricFields.includes(key as MetricField))) {
      return NextResponse.json({ error: 'Modification non autorisée' }, { status: 400 });
    }
    update.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('director_projects').update(update).eq('id', body.project_id).eq('user_id', user.id).select('*').single();
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ project: data });
  }

  if (body.action === 'cycle') {
    const { data: projects, error: projectError } = await supabase.from('director_projects').select('*').eq('user_id', user.id);
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
    if (!projects?.length) return NextResponse.json({ error: 'Initialiser le portefeuille avant le premier cycle.' }, { status: 400 });

    const { data: existing, error: existingError } = await supabase.from('director_proposals').select('proposal_key').eq('user_id', user.id);
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    // Unique (user_id, cycle_date) prevents accidental repeated daily cycles, even across tabs.
    const { data: cycle, error: cycleError } = await supabase.from('director_cycles').insert({ user_id: user.id }).select('id').single();
    if (cycleError) return NextResponse.json({ error: 'Un cycle existe déjà aujourd’hui (UTC), ou la base est indisponible.', detail: cycleError.message }, { status: cycleError.code === '23505' ? 409 : 500 });

    const proposals = proposeCycle(projects as DirectorProject[], (existing ?? []).map((p) => p.proposal_key));
    if (proposals.length) {
      const { error: insertError } = await supabase.from('director_proposals').insert(proposals.map((p) => ({ ...p, user_id: user.id, cycle_id: cycle.id })));
      if (insertError) return NextResponse.json({ error: insertError.message, cycle_id: cycle.id }, { status: 500 });
    }
    await supabase.from('director_cycles').update({ proposals_created: proposals.length }).eq('id', cycle.id).eq('user_id', user.id);
    return NextResponse.json({ cycle_id: cycle.id, proposals_created: proposals.length, executed: 0, mode: 'planning_only' }, { status: 201 });
  }

  if (body.action === 'approve' || body.action === 'reject') {
    if (typeof body.proposal_id !== 'string' || !body.proposal_id) return NextResponse.json({ error: 'Proposition invalide' }, { status: 400 });
    const status = body.action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabase.from('director_proposals')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', body.proposal_id).eq('user_id', user.id).eq('status', 'proposed')
      .select('id,status,title').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Proposition absente ou déjà traitée' }, { status: 409 });
    // Approval is a recorded decision. No external tool is invoked by this endpoint.
    return NextResponse.json({ proposal: data, executed: false });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

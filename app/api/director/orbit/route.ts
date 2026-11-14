import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseOrbitPortfolio, isVerifiedOrbitOwner } from '@/lib/director/orbit';
export const dynamic = 'force-dynamic';

async function readOrbit() {
  const value = process.env.ORBIT_BRIDGE_URL;
  const token = process.env.ORBIT_BRIDGE_TOKEN;
  if (!value || !token || token.length < 32) throw new Error('La passerelle ORBIT n’est pas encore configurée.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.pathname !== '/v1/projects' || url.search || url.hash)
    throw new Error('Origine de la passerelle ORBIT non autorisée.');
  const response = await fetch(url.toString(), {
    method:'GET', headers: {Authorization:`Bearer ${token}`, Accept:'application/json'},
    cache:'no-store', redirect:'error', signal:AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`ORBIT indisponible (HTTP ${response.status})`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Réponse ORBIT non JSON');
  const raw = await response.text();
  if (raw.length > 150000) throw new Error('Réponse ORBIT trop volumineuse');
  const payload = JSON.parse(raw) as {source?:string, has_more?:boolean, records?:unknown};
  if (payload.source !== 'orbit' || payload.has_more) throw new Error('Registre ORBIT non conforme ou incomplet');
  return parseOrbitPortfolio(payload);
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({error:'Supabase non configuré'}, {status:503});
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'Authentification requise'}, {status:401});
  // This bridge reads the owner's PRIVATE ORBIT portfolio. Forge AI may have other
  // authenticated users, so RLS alone does not authorize access to that source.
  // Fail closed until the verified owner's email is explicitly configured.
  if (!isVerifiedOrbitOwner(user, process.env.ORBIT_OWNER_EMAIL)) {
    return NextResponse.json({error:'Import ORBIT réservé au propriétaire vérifié.'}, {status:403});
  }
  let projects;
  try { projects = await readOrbit(); } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Synchronisation ORBIT impossible'}, {status:503});
  }
  let imported = 0, updated = 0;
  for (const project of projects) {
    const { data:existing, error:lookupError } = await supabase.from('director_projects')
      .select('id,orbit_project_id').eq('user_id',user.id).eq('slug',project.slug).maybeSingle();
    if (lookupError) return NextResponse.json({error:lookupError.message}, {status:500});
    const orbitFields = {
      orbit_project_id:project.orbit_project_id, orbit_focus:project.orbit_focus,
      orbit_next_action:project.orbit_next_action, orbit_note:project.orbit_note,
      orbit_evidence_url:project.orbit_evidence_url, orbit_review_date:project.orbit_review_date,
      orbit_revision:project.orbit_revision, orbit_last_sync_at:project.orbit_last_sync_at,
    };
    if (existing) {
      // ORBIT is authoritative for its portfolio stage only.
      // Never overwrite ATL revenue/urgency/evidence/effort/risk scoring.
      if (existing.orbit_project_id && existing.orbit_project_id !== project.orbit_project_id)
        return NextResponse.json({error:'Conflit de correspondance de projet ORBIT'}, {status:409});
      const {error} = await supabase.from('director_projects').update({
        ...orbitFields, stage:project.stage,
      }).eq('id',existing.id).eq('user_id',user.id);
      if(error) return NextResponse.json({error:error.message},{status:500});
      updated++;
    } else {
      const {error} = await supabase.from('director_projects').insert({
        ...orbitFields, user_id:user.id, slug:project.slug,name:project.name,
        stage:project.stage, revenue_potential:2,urgency:2,alignment:2,
        evidence:0,effort:2,risk:2,
      });
      if(error) return NextResponse.json({error:error.message},{status:500});
      imported++;
    }
  }
  return NextResponse.json({source:'orbit', found:projects.length, imported,updated,
    warning: projects.length===0 ? 'Aucune fiche de portefeuille enregistrée dans ORBIT actuellement.' : null,
    executed:0, mode:'read_only_sync'}, {headers:{'Cache-Control':'no-store'}});
}

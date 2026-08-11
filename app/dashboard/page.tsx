import Link from 'next/link';
import { Shell } from '@/components/shell';
import { ActivityTimeline, AgentConstellation, MissionSpotlight, SignalMetric } from '@/components/constellation';
import { Progress, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';
const activeStatuses = ['queued', 'planning', 'running', 'review'];

export default async function PilotagePage() {
  const { supabase, user } = await requireUserSession();
  const [missionsResult, memoryResult, agentsResult, toolsResult, logsResult, prospectsResult] = await Promise.all([
    supabase.from('missions').select('id,title,objective,status,progress,updated_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('memory').select('id,title,collection,content,created_at', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('agents').select('id,name,role,status').eq('user_id', user.id).order('created_at'),
    supabase.from('tools').select('id,name,status').eq('user_id', user.id).order('created_at'),
    supabase.from('logs').select('id,level,source,message,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('prospects').select('id,status', { count: 'exact' }).eq('user_id', user.id),
  ]);
  const missions = missionsResult.data ?? [];
  const memory = memoryResult.data ?? [];
  const agents = agentsResult.data ?? [];
  const tools = toolsResult.data ?? [];
  const logs = logsResult.data ?? [];
  const prospects = prospectsResult.data ?? [];
  const running = missions.filter((mission) => activeStatuses.includes(mission.status));
  const completed = missions.filter((mission) => mission.status === 'completed');
  const successRate = missions.length ? Math.round((completed.length / missions.length) * 100) : 0;
  const spotlight = running[0] ?? missions[0];

  return <Shell title="Pilotage Constellation">
    <div className="grid gap-5 xl:grid-cols-12"><div className="xl:col-span-7"><MissionSpotlight mission={spotlight} /></div><div className="xl:col-span-5"><AgentConstellation agents={agents} tools={tools} /></div></div>
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicateurs du workspace">
      <SignalMetric label="Missions" value={String(missions.length)} detail={`${running.length} signal${running.length > 1 ? 'aux' : ''} actif${running.length > 1 ? 's' : ''}`} icon="target" />
      <SignalMetric label="Prospects" value={String(prospectsResult.count ?? prospects.length)} detail={`${prospects.filter((prospect) => prospect.status === 'qualified').length} qualifiés`} icon="users" tone="amber" />
      <SignalMetric label="Réussite" value={`${successRate}%`} detail={`${completed.length} résultat${completed.length > 1 ? 's' : ''} disponible${completed.length > 1 ? 's' : ''}`} icon="chart" tone="violet" />
      <SignalMetric label="Mémoire" value={String(memoryResult.count ?? memory.length)} detail="Éléments persistants" icon="brain" tone="blue" />
      <SignalMetric label="Réseau" value={`${agents.filter((agent) => agent.status === 'active').length}/${agents.length}`} detail={`${tools.filter((tool) => tool.status === 'enabled').length} connecteurs actifs`} icon="spark" tone="amber" />
    </section>
    <div className="mt-5 grid gap-5 xl:grid-cols-12">
      <section className="constellation-panel xl:col-span-7" aria-labelledby="recent-missions-title"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Orbites récentes</p><h2 id="recent-missions-title" className="mt-1 text-lg font-semibold">Missions</h2></div><Link href="/missions" className="inline-flex items-center gap-2 text-xs text-brand">Tout voir <Icon name="arrow" size={14}/></Link></div><div className="mt-6 divide-y divide-white/[.06]">{missions.slice(0, 5).map((mission, index) => <article key={mission.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[2rem_1fr_auto] md:items-center"><span className="font-mono text-[10px] text-slate-700">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h3 className="truncate text-sm font-medium text-slate-200">{mission.title}</h3><StatusBadge value={mission.status}/></div><p className="mt-1 truncate text-xs text-slate-600">{mission.objective}</p><div className="mt-3 max-w-md"><Progress value={mission.progress}/></div></div><time className="font-mono text-[10px] text-slate-700">{new Date(mission.updated_at).toLocaleDateString('fr-FR')}</time></article>)}{!missions.length && <p className="py-10 text-center text-sm text-slate-500">Aucune mission dans cette orbite.</p>}</div></section>
      <div className="xl:col-span-5"><ActivityTimeline logs={logs}/></div>
    </div>
    <section className="constellation-panel mt-5 overflow-hidden" aria-labelledby="memory-title"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Knowledge shards</p><h2 id="memory-title" className="mt-1 text-lg font-semibold">Mémoire exploitable</h2></div><Link href="/memory" className="inline-flex items-center gap-2 text-xs text-brand">Explorer <Icon name="arrow" size={14}/></Link></div><div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{memory.map((item, index) => <Link href="/memory" key={item.id} className="group relative min-h-36 overflow-hidden rounded-2xl border border-white/[.065] bg-black/15 p-4 transition hover:border-brand/20 hover:bg-brand/[.025]"><span className="font-mono text-[9px] uppercase tracking-[.14em] text-slate-700">Fragment {String(index + 1).padStart(2, '0')}</span><h3 className="mt-4 text-sm font-medium text-slate-200 group-hover:text-brand">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.content}</p><p className="absolute bottom-4 left-4 text-[10px] text-violet-300">{item.collection}</p></Link>)}{!memory.length && <p className="col-span-full py-8 text-center text-sm text-slate-500">Les fragments apparaîtront après une mission réussie.</p>}</div></section>
  </Shell>;
}

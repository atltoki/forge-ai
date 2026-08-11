import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Metric, Progress, StatusBadge } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

const activeStatuses = ['queued', 'planning', 'running', 'review'];

export default async function PilotagePage() {
  const { supabase, user } = await requireUserSession();
  const [missionsResult, memoryResult, agentsResult, logsResult] = await Promise.all([
    supabase.from('missions').select('id,title,objective,status,progress,updated_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('memory').select('id,title,collection,created_at', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('agents').select('id,name,role,status').eq('user_id', user.id).order('created_at'),
    supabase.from('logs').select('id,level,source,message,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const missions = missionsResult.data ?? [];
  const memory = memoryResult.data ?? [];
  const agents = agentsResult.data ?? [];
  const running = missions.filter((mission) => activeStatuses.includes(mission.status));
  const completed = missions.filter((mission) => mission.status === 'completed');
  const successRate = missions.length ? Math.round((completed.length / missions.length) * 100) : 0;
  const priority = running[0]
    ? { label: 'Suivre la mission en cours', detail: running[0].title, href: '/missions', tone: 'Recherche active' }
    : missions[0]?.status === 'failed'
      ? { label: 'Relancer une mission bloquée', detail: missions[0].title, href: '/missions', tone: 'Action requise' }
      : { label: 'Lancer la prochaine prospection', detail: 'Définis une cible et laisse Atlas rechercher les prospects.', href: '/missions', tone: 'Prêt à démarrer' };

  return (
    <Shell title="Pilotage">
      <section className="card overflow-hidden border-brand/20 bg-[radial-gradient(circle_at_top_right,rgba(184,255,92,.1),transparent_42%)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl"><p className="eyebrow">ATLOS · maintenant</p><h2 className="mt-2 text-xl font-semibold md:text-2xl">{priority.label}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{priority.detail}</p></div>
          <div className="flex flex-wrap items-center gap-3"><span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-2 text-xs text-brand">{priority.tone}</span><Link href={priority.href} className="btn-primary">Ouvrir</Link></div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Missions" value={String(missions.length)} detail={`${running.length} en cours`} />
        <Metric label="Réussite" value={`${successRate}%`} detail={`${completed.length} résultats disponibles`} />
        <Metric label="Mémoire" value={String(memoryResult.count ?? memory.length)} detail="Éléments persistants" />
        <Metric label="Agents actifs" value={String(agents.filter((agent) => agent.status === 'active').length)} detail={`${agents.length} agents configurés`} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="eyebrow">Opérations</p><h2 className="mt-1 font-semibold">Missions récentes</h2></div><Link href="/missions" className="text-sm text-brand">Tout voir</Link></div>
          <div className="space-y-5">
            {missions.slice(0, 5).map((mission) => <div key={mission.id}>
              <div className="mb-2 flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{mission.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{mission.objective}</p></div><StatusBadge value={mission.status} /></div>
              <Progress value={mission.progress} />
            </div>)}
            {!missions.length && <p className="text-sm text-slate-400">Aucune mission. Lance la première recherche depuis le cockpit.</p>}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Savoir</p><h2 className="mt-1 font-semibold">Derniers résultats</h2></div><Link href="/memory" className="text-sm text-brand">Mémoire</Link></div>
          <div className="mt-5 space-y-3">
            {memory.map((item) => <div key={item.id} className="rounded-xl border border-line bg-white/[0.025] p-3"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.collection} · {new Date(item.created_at).toLocaleDateString('fr-FR')}</p></div>)}
            {!memory.length && <p className="text-sm text-slate-400">Les résultats validés apparaîtront ici.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card"><div className="flex items-center justify-between"><div><p className="eyebrow">Équipe</p><h2 className="mt-1 font-semibold">Réseau d’agents</h2></div><Link href="/cockpit" className="text-sm text-brand">Cockpit</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{agents.map((agent) => <div key={agent.id} className="rounded-xl border border-line p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{agent.name}</p><StatusBadge value={agent.status} /></div><p className="mt-1 text-xs text-slate-500">{agent.role}</p></div>)}</div></div>
        <div className="card"><p className="eyebrow">Activité</p><h2 className="mt-1 font-semibold">Derniers événements</h2><div className="mt-4 space-y-3">{(logsResult.data ?? []).map((log) => <div key={log.id} className="flex gap-3 text-sm"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${log.level === 'error' ? 'bg-red-400' : 'bg-brand'}`} /><p className="text-slate-300">{log.message}<span className="ml-2 text-xs text-slate-600">{new Date(log.created_at).toLocaleString('fr-FR')}</span></p></div>)}{!logsResult.data?.length && <p className="text-sm text-slate-400">Aucune activité récente.</p>}</div></div>
      </section>
    </Shell>
  );
}

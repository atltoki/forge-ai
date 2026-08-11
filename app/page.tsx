import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Metric, Progress, StatusBadge } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { supabase, user } = await requireUserSession();
  const [missionsResult, agentsResult, toolsResult, memoryResult, executionsResult, logsResult] = await Promise.all([
    supabase.from('missions').select('id,title,objective,status,progress').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('agents').select('id,name,role,status').eq('user_id', user.id).order('created_at'),
    supabase.from('tools').select('id,status').eq('user_id', user.id),
    supabase.from('memory').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('executions').select('id,status').eq('user_id', user.id),
    supabase.from('logs').select('id,message,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
  ]);

  const missions = missionsResult.data ?? [];
  const agents = agentsResult.data ?? [];
  const tools = toolsResult.data ?? [];
  const executions = executionsResult.data ?? [];
  const activeAgents = agents.filter((agent) => agent.status === 'active').length;
  const runningMissions = missions.filter((mission) => ['queued', 'planning', 'running', 'review'].includes(mission.status)).length;
  const completedExecutions = executions.filter((execution) => execution.status === 'completed').length;

  return (
    <Shell title="Dashboard">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Agents actifs" value={String(activeAgents).padStart(2, '0')} detail={`${agents.length} agents configurés`} />
        <Metric label="Missions en cours" value={String(runningMissions).padStart(2, '0')} detail={`${missions.length} missions récentes`} />
        <Metric label="Éléments mémoire" value={String(memoryResult.count ?? 0).padStart(2, '0')} detail="Résultats persistants" />
        <Metric label="Outils disponibles" value={`${tools.filter((tool) => tool.status === 'enabled').length}/${tools.length}`} detail={`${completedExecutions} exécutions terminées`} />
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <div><p className="eyebrow">Mission control</p><h2 className="mt-1 font-semibold">Missions récentes</h2></div>
            <Link href="/missions" className="text-sm text-brand">Voir les missions</Link>
          </div>
          <div className="space-y-5">
            {missions.length ? missions.map((mission) => (
              <div key={mission.id}>
                <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-medium">{mission.title}</span><span className="text-slate-400">{mission.progress}%</span></div>
                <Progress value={mission.progress} />
                <p className="mt-2 text-xs text-slate-500">{mission.objective}</p>
              </div>
            )) : <p className="text-sm text-slate-400">Aucune mission. Lance ta première prospection ATLYN.</p>}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <p className="eyebrow">Équipe</p><h2 className="mt-1 font-semibold">Agents disponibles</h2>
          <div className="mt-5 space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-xs font-bold text-brand">{agent.name[0]}</span>
                <div className="flex-1"><p className="text-sm font-medium">{agent.name}</p><p className="text-xs text-slate-500">{agent.role}</p></div>
                <StatusBadge value={agent.status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card mt-6">
        <p className="eyebrow">Activité récente</p>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          {(logsResult.data ?? []).map((log) => <p key={log.id}>{log.message} <span className="text-slate-500">{new Date(log.created_at).toLocaleString('fr-FR')}</span></p>)}
          {!logsResult.data?.length && <p className="text-slate-400">Les événements des prochaines missions apparaîtront ici.</p>}
        </div>
      </section>
    </Shell>
  );
}

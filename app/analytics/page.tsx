import { Shell } from '@/components/shell';
import { Metric } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { supabase, user } = await requireUserSession();
  const [missionsResult, executionsResult, agentsResult, toolsResult] = await Promise.all([
    supabase.from('missions').select('id,title,status,progress').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('executions').select('id,status,started_at,completed_at').eq('user_id', user.id),
    supabase.from('agents').select('id,status').eq('user_id', user.id),
    supabase.from('tools').select('id,status').eq('user_id', user.id),
  ]);
  const missions = missionsResult.data ?? [];
  const executions = executionsResult.data ?? [];
  const completed = executions.filter((execution) => execution.status === 'completed');
  const successRate = executions.length ? Math.round((completed.length / executions.length) * 100) : 0;
  const durations = completed.flatMap((execution) => execution.started_at && execution.completed_at ? [new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()] : []);
  const averageDuration = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length / 1000) : 0;

  return (
    <Shell title="Analytics">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Taux de réussite" value={`${successRate}%`} detail={`${executions.length} exécutions réelles`} />
        <Metric label="Durée moyenne" value={`${averageDuration}s`} detail={`${durations.length} mesures disponibles`} />
        <Metric label="Agents actifs" value={String((agentsResult.data ?? []).filter((agent) => agent.status === 'active').length)} detail="Agents opérationnels" />
        <Metric label="Outils disponibles" value={`${(toolsResult.data ?? []).filter((tool) => tool.status === 'enabled').length}/${toolsResult.data?.length ?? 0}`} detail="Registry du workspace" />
      </section>
      <section className="card mt-6"><p className="eyebrow">Missions</p><div className="mt-5 grid gap-3 md:grid-cols-3">{missions.length ? missions.map((mission) => (
        <div key={mission.id} className="rounded-lg border border-line bg-white/[0.03] p-4"><p className="text-sm font-medium">{mission.title}</p><p className="mt-2 text-2xl font-semibold">{mission.progress}%</p><p className="mt-1 text-xs text-slate-500">{mission.status}</p></div>
      )) : <p className="text-sm text-slate-400">Aucune donnée disponible.</p>}</div></section>
    </Shell>
  );
}

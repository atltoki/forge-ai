import { Shell } from '@/components/shell';
import { Metric } from '@/components/ui';
import { agents, executions, missions } from '@/lib/data';
import { summarizeToolRegistry } from '@/lib/engines/tool-manager';

export default function AnalyticsPage() {
  const toolStats = summarizeToolRegistry();
  const successRate = Math.round((executions.filter((execution) => execution.status === 'completed').length / executions.length) * 100);
  const averageDuration = Math.round(executions.reduce((sum, execution) => sum + execution.durationMs, 0) / executions.length);

  return (
    <Shell title="Analytics">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Execution success" value={`${successRate}%`} detail={`${executions.length} executions tracked`} />
        <Metric label="Average duration" value={`${averageDuration}ms`} detail="Demo telemetry" />
        <Metric label="Agent utilization" value={`${agents.length}`} detail="Configured specialists" />
        <Metric label="Tool readiness" value={`${toolStats.enabled}/${toolStats.total}`} detail="Enabled registry entries" />
      </section>
      <section className="card mt-6">
        <p className="eyebrow">Mission throughput</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {missions.map((mission) => (
            <div key={mission.id} className="rounded-lg border border-line bg-white/[0.03] p-4">
              <p className="text-sm font-medium">{mission.title}</p>
              <p className="mt-2 text-2xl font-semibold">{mission.progress}%</p>
              <p className="mt-1 text-xs text-slate-500">{mission.status}</p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}

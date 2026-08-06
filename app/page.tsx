import { Shell } from '@/components/shell';
import { Metric, Progress, StatusBadge } from '@/components/ui';
import { agents, executions, logs, missions } from '@/lib/data';
import { createMemorySnapshot } from '@/lib/engines/memory-engine';
import { summarizeToolRegistry } from '@/lib/engines/tool-manager';

export default function Dashboard() {
  const memorySnapshot = createMemorySnapshot();
  const toolRegistry = summarizeToolRegistry();
  const activeAgents = agents.filter((agent) => agent.status === 'active').length;
  const runningMissions = missions.filter((mission) => ['planning', 'running', 'review'].includes(mission.status)).length;
  const completedExecutions = executions.filter((execution) => execution.status === 'completed').length;

  return (
    <Shell title="Dashboard">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active agents" value={String(activeAgents).padStart(2, '0')} detail={`${agents.length} total agents`} />
        <Metric label="Running missions" value={String(runningMissions).padStart(2, '0')} detail="Manager orchestration online" />
        <Metric label="Memory items" value={String(memorySnapshot.total).padStart(2, '0')} detail={`${memorySnapshot.collections.length} collections`} />
        <Metric label="Enabled tools" value={`${toolRegistry.enabled}/${toolRegistry.total}`} detail={`${toolRegistry.needsConfig} need config`} />
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="eyebrow">Mission control</p>
              <h2 className="mt-1 font-semibold">Current missions</h2>
            </div>
            <StatusBadge value={`${completedExecutions} executions complete`} />
          </div>
          <div className="space-y-5">
            {missions.map((mission) => (
              <div key={mission.id}>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="font-medium">{mission.title}</span>
                  <span className="text-slate-400">{mission.progress}%</span>
                </div>
                <Progress value={mission.progress} />
                <p className="mt-2 text-xs text-slate-500">{mission.objective}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <p className="eyebrow">Live team</p>
          <h2 className="mt-1 font-semibold">Agents online</h2>
          <div className="mt-5 space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-3">
                <span className={'grid h-9 w-9 place-items-center rounded-xl text-xs font-bold ' + agent.color}>{agent.name[0]}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.role}</p>
                </div>
                <StatusBadge value={agent.status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card mt-6">
        <p className="eyebrow">Activity</p>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          {logs.map((log) => (
            <p key={log.id}>{log.message} <span className="text-slate-500">{log.createdAt}</span></p>
          ))}
        </div>
      </section>
    </Shell>
  );
}

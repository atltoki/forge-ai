import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { listAgentsWithLoad } from '@/lib/engines/agent-engine';

export default function AgentsPage() {
  const agents = listAgentsWithLoad();

  return (
    <Shell title="Agents">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-slate-400">Chaque agent possède ses objectifs, ses outils autorisés, sa mémoire et son historique de missions.</p>
        <button className="btn-primary">Create agent</button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.id} className="card">
            <div className="flex justify-between gap-3">
              <span className={'grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold ' + agent.color}>{agent.name[0]}</span>
              <StatusBadge value={agent.status} />
            </div>
            <h2 className="mt-5 text-lg font-semibold">{agent.name}</h2>
            <p className="text-sm text-slate-400">{agent.role}</p>
            <p className="mt-3 text-xs text-slate-500">{agent.model}</p>
            <div className="mt-5 space-y-2">
              {agent.objectives.map((objective) => (
                <p key={objective} className="rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{objective}</p>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <span className="text-slate-500">{agent.activeMissionCount} active</span>
              <span className="text-slate-500">{agent.queuedMissionCount} queued</span>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

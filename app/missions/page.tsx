import { Shell } from '@/components/shell';
import { Progress, StatusBadge } from '@/components/ui';
import { agents } from '@/lib/data';
import { listMissions } from '@/lib/engines/mission-engine';

export default function MissionsPage() {
  const missions = listMissions();

  return (
    <Shell title="Missions">
      <div className="card overflow-hidden p-0">
        <div className="border-b border-line p-5">
          <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Search missions..." />
        </div>
        <div className="divide-y divide-line">
          {missions.map((mission) => {
            const agent = agents.find((item) => item.id === mission.agentId);

            return (
              <div key={mission.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{mission.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">Assigned to {agent?.name ?? 'Manager'} · Updated {mission.updated}</p>
                  </div>
                  <StatusBadge value={mission.status} />
                </div>
                <p className="mt-3 text-sm text-slate-400">{mission.objective}</p>
                <div className="mt-4 max-w-xl"><Progress value={mission.progress} /></div>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {mission.steps.map((step) => (
                    <div key={step.id} className="rounded-lg border border-line bg-white/[0.03] p-3">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{step.toolIds.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

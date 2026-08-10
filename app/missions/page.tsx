'use client';

import { FormEvent, useState } from 'react';
import { Shell } from '@/components/shell';
import { Progress, StatusBadge } from '@/components/ui';
import { agents } from '@/lib/data';
import { listMissions } from '@/lib/engines/mission-engine';

export default function MissionsPage() {
  const [missions, setMissions] = useState(listMissions());
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function createMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus('Création…');
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, objective }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de créer la mission.');
      const plan = payload.plan ?? payload.data?.plan ?? payload.data;
      if (plan?.title && plan?.objective) {
        setMissions((current) => [{ id: `local-${Date.now()}`, title: plan.title, objective: plan.objective, agentId: plan.manager ?? 'manager', status: 'queued', progress: 0, updated: 'à l’instant', steps: plan.steps ?? [] }, ...current]);
      }
      setTitle('');
      setObjective('');
      setStatus(payload.warning ? `Mission créée, mais non envoyée : ${payload.warning}` : 'Mission créée et envoyée au Worker.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell title="Missions">
      <form onSubmit={createMission} className="card mb-6 grid gap-4">
        <div>
          <p className="eyebrow">New mission</p>
          <h2 className="mt-1 font-semibold">Lancer une mission</h2>
        </div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-line bg-[#101114] px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Titre de la mission" required />
        <textarea value={objective} onChange={(event) => setObjective(event.target.value)} className="min-h-24 w-full rounded-lg border border-line bg-[#101114] px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Ex. Trouve 20 entreprises de transport au Portugal." required />
        <div className="flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={submitting}>{submitting ? 'Création…' : 'Créer la mission'}</button>{status && <p className="text-sm text-slate-400" role="status">{status}</p>}</div>
      </form>
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

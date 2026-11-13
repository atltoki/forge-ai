'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { priorityScore, type DirectorProject, type Stage } from '@/lib/director/core';

type Project = DirectorProject;
type Proposal = {
  id: string; title: string; objective: string; rationale: string;
  project_id: string; action_kind: string; priority_score: number;
  status: string; agent_key: string; requires_approval: boolean; created_at: string;
};
type Cycle = { id: string; cycle_date: string; proposals_created: number };
type State = { projects: Project[]; proposals: Proposal[]; cycles: Cycle[]; mode: string; execution_enabled: boolean };
type EditableField = 'revenue_potential' | 'urgency' | 'alignment' | 'evidence' | 'effort' | 'risk';
const metrics: { key: EditableField; label: string; info: string }[] = [
  { key: 'revenue_potential', label: 'Revenus', info: 'Potentiel commercial estimé' },
  { key: 'urgency', label: 'Urgence', info: 'Coût du retard' },
  { key: 'alignment', label: 'Alignement', info: 'Pertinence stratégique' },
  { key: 'evidence', label: 'Preuves', info: 'Qualité des données vérifiées' },
  { key: 'effort', label: 'Effort', info: 'Charge de travail estimée' },
  { key: 'risk', label: 'Risque', info: 'Risque technique ou commercial' },
];
const stages: { value: Stage; label: string }[] = [
  { value: 'unverified', label: 'Non vérifié' },
  { value: 'idea', label: 'Idée' },
  { value: 'building', label: 'Construction' },
  { value: 'live', label: 'En ligne' },
  { value: 'paused', label: 'En pause' },
];

export function DirectorCockpit() {
  const [state, setState] = useState<State | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Project | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/director', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Impossible de charger le portefeuille.');
    setState(payload);
  }, []);

  useEffect(() => { void load().catch((err) => setError(String(err.message || err))); }, [load]);

  const perform = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const response = await fetch('/api/director', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Action impossible');
      await load();
      if (action === 'cycle') setNotice(`${payload.proposals_created} décision(s) proposée(s). Aucune action externe exécutée.`);
      else if (action === 'bootstrap') setNotice('Portefeuille initialisé. Les informations doivent encore être vérifiées.');
      else setNotice('Décision enregistrée, sans exécution automatique.');
      if (action === 'update_project') { setEditing(null); setDraft(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally { setBusy(false); }
  }, [busy, load]);

  const ranked = useMemo(() => [...(state?.projects ?? [])].sort((a,b) => priorityScore(b) - priorityScore(a) || a.name.localeCompare(b.name)), [state]);
  const proposed = (state?.proposals ?? []).filter((item) => item.status === 'proposed');
  const reviewed = (state?.proposals ?? []).filter((item) => item.status !== 'proposed');

  return <div className="space-y-6">
    <div className="constellation-panel overflow-hidden">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">PORTFOLIO INTELLIGENCE / V0.1</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Un directeur, pas un chatbot.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Classe les projets, propose deux missions au maximum par cycle et consigne tes décisions.
            Mode planification uniquement : aucun agent ne modifie les dépôts ou la production.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!state?.projects.length
            ? <button disabled={busy || !state} className="btn-primary" onClick={() => void perform('bootstrap')}>Initialiser le portefeuille</button>
            : <button disabled={busy} className="btn-primary" onClick={() => void perform('cycle')}>Lancer le cycle du jour</button>}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Projets', String(state?.projects.length ?? 0)],
          ['À décider', String(proposed.length)],
          ['Cycles', String(state?.cycles.length ?? 0)],
          ['Exécutions auto', '0'],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>)}
      </div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-brand/20 bg-brand/[.07] px-4 py-3 text-sm text-brand">{notice}</div>}

    <section className="constellation-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">01 / PRIORITÉS</p><h2 className="mt-1 text-lg font-semibold">Portefeuille de projets</h2></div>
        <span className="text-xs text-slate-500">Scores heuristiques, pas revenus constatés</span>
      </div>
      <div className="mt-5 grid gap-3">
        {ranked.map((project, index) => <article key={project.id} className="rounded-2xl border border-white/[.08] bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
            <h3 className="font-medium text-white">{project.name}</h3>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">{stages.find((stage) => stage.value === project.stage)?.label}</span>
            {project.evidence === 0 && <span className="text-[10px] text-amber-300">Hypothèses non vérifiées</span>}
            <span className="ml-auto font-mono text-sm font-semibold text-brand">{priorityScore(project)}/100</span>
            <button className="btn-muted !px-3 !py-1.5 !text-xs" onClick={() => { setEditing(editing === project.id ? null : project.id); setDraft({ ...project }); }} type="button">{editing === project.id ? 'Fermer' : 'Évaluer'}</button>
          </div>
          {editing === project.id && draft && <div className="mt-5 border-t border-white/[.07] pt-4">
            <label className="block text-xs text-slate-400">Phase
              <select className="field mt-2" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as Stage })}>
                {stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => <label key={metric.key} className="text-xs text-slate-400">
                <span className="flex justify-between"><span>{metric.label}</span><span className="font-mono text-brand">{draft[metric.key]}/5</span></span>
                <input className="mt-3 w-full accent-lime-300" type="range" min={0} max={5} step={1}
                  title={metric.info} value={draft[metric.key]}
                  onChange={(e) => setDraft({ ...draft, [metric.key]: Number(e.target.value) })} />
              </label>)}
            </div>
            <button className="btn-primary mt-5" disabled={busy} onClick={() => void perform('update_project', { project_id: project.id,
              fields: { stage: draft.stage, ...Object.fromEntries(metrics.map((metric) => [metric.key, draft[metric.key]])) } })}>
              Enregistrer l’évaluation
            </button>
          </div>}
        </article>)}
        {state && ranked.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Portefeuille vide. Initialise les projets candidats pour commencer.</p>}
        {!state && !error && <p className="py-8 text-center text-sm text-slate-500">Chargement…</p>}
      </div>
    </section>

    <section className="constellation-panel">
      <p className="eyebrow">02 / VALIDATIONS</p>
      <h2 className="mt-1 text-lg font-semibold">Décisions en attente</h2>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {proposed.map((proposal) => <article key={proposal.id} className="flex flex-col rounded-2xl border border-brand/15 bg-brand/[.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase text-brand">{proposal.agent_key} / {proposal.action_kind}</span>
            <span className="font-mono text-xs text-slate-400">{proposal.priority_score}/100</span>
          </div>
          <h3 className="mt-3 font-semibold">{proposal.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{proposal.objective}</p>
          <p className="mt-3 text-xs text-slate-500">{proposal.rationale}</p>
          <div className="mt-auto flex gap-2 pt-5">
            <button disabled={busy} className="btn-primary" onClick={() => void perform('approve', { proposal_id: proposal.id })}>Valider le plan</button>
            <button disabled={busy} className="btn-muted" onClick={() => void perform('reject', { proposal_id: proposal.id })}>Refuser</button>
          </div>
        </article>)}
        {!proposed.length && <p className="text-sm text-slate-500">Aucune proposition en attente. Un cycle de planification crée des suggestions, pas des exécutions.</p>}
      </div>
      {reviewed.length > 0 && <div className="mt-7 border-t border-white/[.07] pt-5">
        <h3 className="mb-3 text-sm font-medium">Historique des décisions</h3>
        {reviewed.slice(0, 8).map((proposal) => <p key={proposal.id} className="py-2 text-xs text-slate-400">
          <span className="mr-3 font-mono uppercase text-slate-500">{proposal.status}</span>{proposal.title}
        </p>)}
      </div>}
    </section>
  </div>;
}

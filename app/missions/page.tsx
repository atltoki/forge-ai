'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Icon } from '@/components/icons';
import { Progress, StatusBadge } from '@/components/ui';

type Source = { title?: string; url?: string };
type ExecutionRecord = { id: string; status: string; output: Record<string, unknown> | null; error: string | null; started_at: string | null; completed_at: string | null; created_at: string };
type MissionRecord = { id: string; title: string; objective: string; status: string; progress: number; result: Record<string, unknown> | null; created_at: string; updated_at: string; executions?: ExecutionRecord[] };
type Notice = { tone: 'success' | 'error' | 'info'; message: string } | null;

const missionTemplates = [
  { label: 'Transport Portugal', title: 'Prospection transport Portugal', objective: 'Trouve 20 entreprises de transport au Portugal. Pour chaque entreprise, vérifie le site web, la ville, l’activité, un contact professionnel public et ajoute les sources utilisées.' },
  { label: 'Cabinets comptables', title: 'Cabinets comptables France', objective: 'Trouve 20 cabinets comptables indépendants en France susceptibles d’accompagner des PME. Vérifie le site, la ville, les spécialités et les coordonnées professionnelles publiques.' },
  { label: 'Concurrents', title: 'Veille concurrentielle', objective: 'Identifie les principaux concurrents de la cible décrite, puis compare leur positionnement, leurs offres, leurs preuves publiques et leurs coordonnées professionnelles.' },
];

function resultText(result: Record<string, unknown> | null) {
  if (!result) return '';
  if (typeof result.result === 'string') return result.result;
  if (typeof result.error === 'string') return result.error;
  if ('plan' in result && Object.keys(result).length === 1) return '';
  return JSON.stringify(result, null, 2);
}

function resultSources(result: Record<string, unknown> | null): Source[] {
  return Array.isArray(result?.sources) ? result.sources.filter((source): source is Source => Boolean(source && typeof source === 'object')) : [];
}

function resultSections(text: string) {
  const parts = text.split(/^##\s+/m);
  if (parts.length < 2) return { intro: '', prospects: [] as Array<{ name: string; details: string }> };
  return {
    intro: parts[0].replace(/^#+\s*/gm, '').trim(),
    prospects: parts.slice(1).map((part) => {
      const [name, ...details] = part.trim().split('\n');
      return { name: name.trim(), details: details.join('\n').trim() };
    }).filter((prospect) => prospect.name),
  };
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadMission(mission: MissionRecord) {
  const text = resultText(mission.result);
  const sources = resultSources(mission.result).map((source) => source.url).filter(Boolean).join(' | ');
  const csv = ['Titre,Objectif,Statut,Date,Résultat,Sources', [mission.title, mission.objective, mission.status, mission.created_at, text, sources].map(escapeCsv).join(',')].join('\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${mission.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'mission'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function MissionTimeline({ status }: { status: string }) {
  const failed = status === 'failed';
  const index = status === 'completed' ? 3 : status === 'running' || failed ? 1 : 0;
  const steps = ['Mission créée', 'Recherche web', 'Résultat prêt'];
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Étapes de la mission">
      {steps.map((step, stepIndex) => {
        const done = status === 'completed' || stepIndex < index;
        const active = !failed && stepIndex === index;
        const error = failed && stepIndex === 1;
        return <li key={step} className={`rounded-xl border px-3 py-3 text-xs ${done ? 'border-brand/20 bg-brand/[0.06] text-brand' : error ? 'border-red-400/20 bg-red-500/[0.06] text-red-300' : active ? 'border-brand/30 text-slate-200' : 'border-line text-slate-600'}`}><span className="mb-2 block">{done ? <Icon name="check" size={15} /> : error ? '!' : stepIndex + 1}</span>{step}</li>;
      })}
    </ol>
  );
}

function FormattedResult({ text }: { text: string }) {
  const parsed = resultSections(text);
  if (!parsed.prospects.length) return <div className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{text}</div>;
  return <div>{parsed.intro && <p className="mb-5 text-sm leading-6 text-slate-300">{parsed.intro}</p>}<div className="grid gap-3 lg:grid-cols-2">{parsed.prospects.map((prospect, index) => <article key={`${prospect.name}-${index}`} className="result-card"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand/10 font-mono text-xs text-brand">{index + 1}</span><div className="min-w-0"><h4 className="font-semibold text-white">{prospect.name}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{prospect.details}</p></div></div></article>)}</div></div>;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [title, setTitle] = useState('Prospection ATLYN');
  const [objective, setObjective] = useState('Trouve 20 entreprises de transport au Portugal. Pour chaque entreprise, vérifie le site web, la ville, l’activité et ajoute les sources publiques utilisées.');
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMissions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/missions', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger les missions.');
      setMissions(payload.data ?? []);
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Impossible de charger les missions.' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
    const timer = window.setInterval(() => void loadMissions(true), 4000);
    return () => window.clearInterval(timer);
  }, [loadMissions]);

  async function launchMission(nextTitle: string, nextObjective: string, isRetry = false) {
    setSubmitting(!isRetry);
    setNotice({ tone: 'info', message: isRetry ? 'Nouvelle exécution en préparation…' : 'Mission envoyée à Atlas…' });
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: nextTitle, objective: nextObjective }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de créer la mission.');
      setMissions((current) => [payload.data, ...current.filter((mission) => mission.id !== payload.data.id)]);
      setExpandedId(payload.data.id);
      setNotice(payload.warning ? { tone: 'error', message: `Mission créée, mais son lancement a échoué : ${payload.warning}` } : { tone: 'success', message: 'Mission lancée. Atlas recherche maintenant les prospects.' });
      if (!isRetry && !payload.warning) { setTitle(''); setObjective(''); }
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Une erreur est survenue.' });
    } finally {
      setSubmitting(false);
      setBusyId(null);
    }
  }

  async function createMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await launchMission(title.trim(), objective.trim());
  }

  async function retryMission(mission: MissionRecord) {
    setBusyId(mission.id);
    await launchMission(mission.title, mission.objective, true);
  }

  async function deleteMission(mission: MissionRecord) {
    if (!window.confirm(`Supprimer définitivement la mission « ${mission.title} » ?`)) return;
    setBusyId(mission.id);
    try {
      const response = await fetch(`/api/missions?id=${encodeURIComponent(mission.id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Suppression impossible.');
      setMissions((current) => current.filter((item) => item.id !== mission.id));
      setNotice({ tone: 'success', message: 'Mission supprimée.' });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Suppression impossible.' });
    } finally {
      setBusyId(null);
    }
  }

  async function copyResult(mission: MissionRecord) {
    try {
      await navigator.clipboard.writeText(resultText(mission.result));
      setNotice({ tone: 'success', message: 'Résultat copié dans le presse-papiers.' });
    } catch {
      setNotice({ tone: 'error', message: 'Le navigateur a refusé la copie.' });
    }
  }

  const filtered = useMemo(() => missions.filter((mission) => {
    const matchesText = `${mission.title} ${mission.objective}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || mission.status === filter || (filter === 'active' && ['queued', 'planning', 'running'].includes(mission.status));
    return matchesText && matchesFilter;
  }), [missions, query, filter]);

  const counts = useMemo(() => ({ total: missions.length, active: missions.filter((mission) => ['queued', 'planning', 'running'].includes(mission.status)).length, completed: missions.filter((mission) => mission.status === 'completed').length }), [missions]);

  return (
    <Shell title="Missions">
      <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Résumé des missions">
        {[['Missions', counts.total, 'Depuis le lancement'], ['En cours', counts.active, 'Recherche active'], ['Terminées', counts.completed, 'Résultats disponibles']].map(([label, value, detail]) => <div key={label} className="rounded-2xl border border-line bg-panel px-5 py-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-[11px] text-slate-600">{detail}</p></div>)}
      </section>

      <form onSubmit={createMission} className="card mb-6 grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Nouvelle mission</p><h2 className="mt-1 text-xl font-semibold">Que doit rechercher Atlas ?</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Décris la cible et les informations nécessaires. Atlas recherchera sur le web et citera ses sources.</p></div><span className="rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1.5 text-xs text-brand">Tavily Search + Gemini</span></div>
        <div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Démarrage rapide</p><div className="flex flex-wrap gap-2">{missionTemplates.map((template) => <button key={template.label} type="button" className="rounded-full border border-line bg-white/[.025] px-3 py-2 text-xs text-slate-400 transition hover:border-brand/20 hover:text-brand" onClick={() => { setTitle(template.title); setObjective(template.objective); }}>{template.label}</button>)}</div></div>
        <div><label htmlFor="mission-title" className="mb-2 block text-sm font-medium text-slate-300">Nom de la mission</label><input id="mission-title" value={title} onChange={(event) => setTitle(event.target.value)} className="field" placeholder="Ex. Transporteurs au Portugal" required /></div>
        <div><label htmlFor="mission-objective" className="mb-2 block text-sm font-medium text-slate-300">Objectif détaillé</label><textarea id="mission-objective" value={objective} onChange={(event) => setObjective(event.target.value)} className="field min-h-32 resize-y" placeholder="Ex. Trouve 20 entreprises, vérifie leur site, leur ville et leur activité…" required /></div>
        <div className="flex flex-wrap items-center gap-3"><button className="btn-primary w-full sm:w-auto" disabled={submitting}>{submitting ? 'Lancement…' : <><Icon name="search" /> Lancer la recherche</>}</button><p className="text-xs text-slate-500">Une mission peut prendre quelques minutes.</p></div>
      </form>

      {notice && <div className={`mb-6 flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${notice.tone === 'error' ? 'border-red-400/20 bg-red-500/10 text-red-200' : notice.tone === 'success' ? 'border-brand/20 bg-brand/[0.07] text-brand' : 'border-blue-400/20 bg-blue-500/10 text-blue-200'}`} role="status"><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} className="text-current opacity-60 hover:opacity-100" aria-label="Fermer">×</button></div>}

      <section className="card overflow-hidden p-0" aria-labelledby="missions-list-title">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center md:p-5"><div className="relative flex-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Icon name="search" size={17} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} className="field !py-2.5 pl-10" placeholder="Rechercher une mission…" aria-label="Rechercher une mission" /></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="field sm:w-48" aria-label="Filtrer les missions"><option value="all">Tous les statuts</option><option value="active">En cours</option><option value="completed">Terminées</option><option value="failed">En échec</option></select></div>
        <h2 id="missions-list-title" className="sr-only">Liste des missions</h2>
        {loading ? <div className="p-8 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand/20 border-t-brand" /><p className="mt-3 text-sm text-slate-400">Chargement des missions…</p></div> : filtered.length ? <div className="divide-y divide-line">{filtered.map((mission) => {
          const execution = mission.executions?.[0];
          const text = resultText(mission.result);
          const sources = resultSources(mission.result);
          const expanded = expandedId === mission.id;
          return <article key={mission.id} className="p-4 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{mission.title}</h3><StatusBadge value={mission.status} /></div><p className="mt-2 text-xs text-slate-500">Créée le {new Date(mission.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{mission.objective}</p></div><button type="button" onClick={() => setExpandedId(expanded ? null : mission.id)} className="btn-muted shrink-0" aria-expanded={expanded}>{expanded ? 'Réduire' : 'Voir les détails'}<span className={`transition ${expanded ? 'rotate-90' : ''}`}><Icon name="chevron" size={16} /></span></button></div>
            <div className="mt-5"><Progress value={mission.progress} /></div>
            <MissionTimeline status={mission.status} />
            {expanded && <div className="mt-5 border-t border-line pt-5">
              {execution?.error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"><p className="font-semibold">La recherche n’a pas abouti</p><p className="mt-1 text-red-300/80">{execution.error}</p></div>}
              {text && mission.status === 'completed' && <section className="rounded-2xl border border-brand/20 bg-brand/[0.035] p-4 md:p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Résultat</p><h4 className="mt-1 font-semibold">Prospects trouvés par Atlas</h4></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyResult(mission)} className="btn-muted !min-h-9 !px-3 !py-2"><Icon name="copy" size={15} /> Copier</button><button type="button" onClick={() => downloadMission(mission)} className="btn-muted !min-h-9 !px-3 !py-2"><Icon name="download" size={15} /> CSV</button></div></div><FormattedResult text={text} />{sources.length > 0 && <div className="mt-6 border-t border-line pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sources vérifiées</p><div className="mt-3 flex flex-wrap gap-2">{sources.map((source, index) => source.url ? <a key={`${source.url}-${index}`} className="max-w-full truncate rounded-full border border-line px-3 py-2 text-xs text-brand hover:bg-white/5" href={source.url} target="_blank" rel="noreferrer">{source.title || new URL(source.url).hostname}</a> : null)}</div></div>}</section>}
              {!text && !execution?.error && <p className="rounded-xl border border-line bg-white/[0.02] p-4 text-sm text-slate-400">Atlas prépare encore le résultat. Cette page se met à jour automatiquement.</p>}
              <div className="mt-4 flex flex-wrap gap-2">{mission.status === 'completed' && <Link href="/prospects" className="btn-primary"><Icon name="users" size={16}/>Ouvrir dans Prospects</Link>}<button type="button" onClick={() => void retryMission(mission)} disabled={busyId === mission.id} className="btn-muted"><Icon name="retry" size={16} /> Relancer</button><button type="button" onClick={() => void deleteMission(mission)} disabled={busyId === mission.id} className="btn-ghost text-red-300 hover:bg-red-500/10"><Icon name="trash" size={16} /> Supprimer</button></div>
            </div>}
          </article>;
        })}</div> : <div className="p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><Icon name="target" /></div><h3 className="mt-4 font-semibold">Aucune mission trouvée</h3><p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">Modifie les filtres ou lance une nouvelle recherche avec le formulaire.</p></div>}
      </section>
    </Shell>
  );
}

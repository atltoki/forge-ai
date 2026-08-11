'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/shell';
import { Progress, StatusBadge } from '@/components/ui';

type Source = { title?: string; url?: string };
type ExecutionRecord = {
  id: string;
  status: string;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};
type MissionRecord = {
  id: string;
  title: string;
  objective: string;
  status: string;
  progress: number;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  executions?: ExecutionRecord[];
};

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

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [title, setTitle] = useState('Prospection ATLYN');
  const [objective, setObjective] = useState('Trouve 20 entreprises de transport au Portugal. Pour chaque entreprise, vérifie le site web, la ville, l’activité et ajoute les sources publiques utilisées.');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');

  const loadMissions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/missions', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger les missions.');
      setMissions(payload.data ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Impossible de charger les missions.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
    const timer = window.setInterval(() => void loadMissions(true), 4000);
    return () => window.clearInterval(timer);
  }, [loadMissions]);

  async function createMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus('Création et envoi au Worker…');
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, objective }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de créer la mission.');
      setMissions((current) => [payload.data, ...current.filter((mission) => mission.id !== payload.data.id)]);
      setStatus(payload.warning ? `Mission créée, mais l’exécution a échoué : ${payload.warning}` : 'Mission créée. Atlas effectue maintenant la recherche.');
      if (!payload.warning) {
        setTitle('');
        setObjective('');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => missions.filter((mission) => `${mission.title} ${mission.objective}`.toLowerCase().includes(query.toLowerCase())), [missions, query]);

  return (
    <Shell title="Missions">
      <form onSubmit={createMission} className="card mb-6 grid gap-4">
        <div><p className="eyebrow">Nouvelle mission</p><h2 className="mt-1 font-semibold">Lancer une recherche ATLYN</h2></div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-line bg-[#101114] px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Titre de la mission" required />
        <textarea value={objective} onChange={(event) => setObjective(event.target.value)} className="min-h-28 w-full rounded-lg border border-line bg-[#101114] px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Décris précisément les prospects et informations recherchés." required />
        <div className="flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={submitting}>{submitting ? 'Envoi…' : 'Créer et lancer la mission'}</button>{status && <p className="text-sm text-slate-400" role="status">{status}</p>}</div>
      </form>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-line p-5"><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" placeholder="Rechercher une mission…" /></div>
        {loading ? <p className="p-8 text-sm text-slate-400">Chargement des missions réelles…</p> : filtered.length ? <div className="divide-y divide-line">{filtered.map((mission) => {
          const execution = mission.executions?.[0];
          const text = resultText(mission.result);
          const sources = resultSources(mission.result);
          return (
            <article key={mission.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-medium">{mission.title}</h2><p className="mt-1 text-xs text-slate-500">Créée le {new Date(mission.created_at).toLocaleString('fr-FR')}</p></div>
                <StatusBadge value={mission.status} />
              </div>
              <p className="mt-3 text-sm text-slate-400">{mission.objective}</p>
              <div className="mt-4"><Progress value={mission.progress} /></div>
              {execution?.error && <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{execution.error}</p>}
              {text && (
                <section className="mt-5 rounded-xl border border-brand/20 bg-brand/[0.04] p-5">
                  <p className="eyebrow">Résultat</p>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{text}</div>
                  {sources.length > 0 && <div className="mt-5 border-t border-line pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sources</p><div className="mt-2 flex flex-wrap gap-2">{sources.map((source, index) => source.url ? <a key={`${source.url}-${index}`} className="rounded-full border border-line px-3 py-1.5 text-xs text-brand hover:bg-white/5" href={source.url} target="_blank" rel="noreferrer">{source.title || new URL(source.url).hostname}</a> : null)}</div></div>}
                </section>
              )}
            </article>
          );
        })}</div> : <p className="p-8 text-sm text-slate-400">Aucune mission. Le formulaire ci-dessus lance une véritable recherche.</p>}
      </div>
    </Shell>
  );
}

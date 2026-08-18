'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';

type Opportunity = {
  id: string;
  title: string;
  detail: string;
  type: 'revenu' | 'temps' | 'risque';
  value: number;
  minutes: number;
  score: number;
  action: string;
  objective: string;
  requiresApproval?: boolean;
};

const filters = [
  ['all', 'Toutes'],
  ['revenu', 'Revenus'],
  ['temps', 'Temps'],
  ['risque', 'Risques'],
] as const;

function euro(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function ProfitCommandCenter({ opportunities, pipelineValue, hoursSaved, approvalCount }: { opportunities: Opportunity[]; pipelineValue: number; hoursSaved: number; approvalCount: number }) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const visible = useMemo(() => opportunities.filter((item) => filter === 'all' || item.type === filter), [filter, opportunities]);

  async function run(item: Opportunity) {
    setBusy(item.id); setNotice('');
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: item.title, objective: item.objective }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Action impossible à lancer');
      setDone((current) => [...current, item.id]);
      setNotice(item.requiresApproval ? 'Préparation lancée. Tu valideras le message avant son envoi.' : 'Action lancée. JARVIS suit maintenant son exécution.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Action impossible à lancer'); }
    finally { setBusy(null); }
  }

  return <section className="profit-command constellation-panel overflow-hidden" aria-labelledby="profit-title">
    <div className="profit-orb profit-orb-one"/><div className="profit-orb profit-orb-two"/>
    <div className="relative grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
      <div className="neural-stage">
        <div className="flex w-full items-center justify-between"><div><p className="eyebrow">Neural command</p><h2 id="profit-title" className="mt-1 text-xl font-semibold">JARVIS <span className="text-brand">EN LIGNE</span></h2></div><span className="live-signal"><span/>Contexte actif</span></div>
        <div className="neural-core" aria-label="Noyau JARVIS actif"><div className="neural-ring ring-a"/><div className="neural-ring ring-b"/><div className="neural-ring ring-c"/><div className="neural-brain"><i/><i/><i/><i/><i/><i/><span/></div></div>
        <div className="neural-stats"><p><span>Compréhension</span><strong>98%</strong></p><p><span>Recommandations</span><strong>{opportunities.length}</strong></p><p><span>Données synchronisées</span><strong>100%</strong></p><p><span>Impact maximal</span><strong>{opportunities[0]?.score ?? 0}</strong></p></div>
      </div>
      <div className="priority-stage">
        <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Priorités du jour</p><h3 className="mt-1 text-lg font-semibold">Meilleures actions</h3></div><span className="text-xs text-slate-600">Impact × urgence</span></div>
        <div className="mt-5 grid gap-3">{opportunities.slice(0, 3).map((item, index) => <button key={item.id} onClick={() => void run(item)} disabled={busy === item.id || done.includes(item.id)} className="priority-row group"><span className="priority-number">{index + 1}</span><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/[.07] text-brand"><Icon name={item.type === 'revenu' ? 'retry' : item.type === 'temps' ? 'clock' : 'shield'} size={18}/></span><span className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm font-medium text-slate-100">{item.title}</strong><small className="mt-1 block uppercase tracking-[.08em] text-slate-600">{item.type} · impact {Math.round(item.score)}</small></span><span className="text-right"><strong className="block text-sm text-brand">{item.value ? euro(item.value) : `${item.minutes} min`}</strong><small className="text-[10px] text-slate-600">{done.includes(item.id) ? 'Lancée' : busy === item.id ? 'Analyse…' : 'Exécuter'}</small></span><Icon name="chevron" size={15}/></button>)}</div>
        <button onClick={() => setFilter('all')} className="btn-primary mt-4 w-full">Voir toutes les priorités <Icon name="arrow" size={16}/></button>
      </div>
    </div>

    <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="profit-kpi"><span>Valeur du pipeline</span><strong>{euro(pipelineValue)}</strong><small>opportunités pondérées</small></article>
      <article className="profit-kpi"><span>Temps récupérable</span><strong>{hoursSaved.toLocaleString('fr-FR')} h</strong><small>sur les actions détectées</small></article>
      <article className="profit-kpi"><span>À valider</span><strong>{approvalCount}</strong><small>aucun envoi automatique</small></article>
      <article className="profit-kpi accent"><span>Score d’impact</span><strong>{opportunities[0]?.score ?? 0}/100</strong><small>meilleure action disponible</small></article>
    </div>

    <div className="relative mt-7 flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer les opportunités"><span className="mr-2 hidden font-mono text-[9px] uppercase tracking-[.12em] text-slate-700 sm:inline">Toutes les actions</span>
      {filters.map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`profit-filter ${filter === value ? 'active' : ''}`}>{label}</button>)}
    </div>

    <div className="relative mt-4 grid gap-3">
      {visible.map((item, index) => <article key={item.id} className="opportunity-card">
        <div className="opportunity-rank">{String(index + 1).padStart(2, '0')}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-slate-100">{item.title}</h3><span className={`opportunity-type ${item.type}`}>{item.type}</span>{item.requiresApproval && <span className="opportunity-type approval">validation requise</span>}</div><p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p><div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[.08em] text-slate-600"><span className="text-brand">Impact {item.score}/100</span>{item.value > 0 && <span>+ {euro(item.value)}</span>}<span>{item.minutes} min économisées</span></div></div>
        <button onClick={() => run(item)} disabled={busy === item.id || done.includes(item.id)} className="btn-muted shrink-0 !min-h-10 !px-3">{busy === item.id ? 'Lancement…' : done.includes(item.id) ? <><Icon name="check" size={15}/> Lancée</> : <>{item.action}<Icon name="arrow" size={15}/></>}</button>
      </article>)}
      {!visible.length && <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Aucune opportunité dans cette catégorie.</p>}
    </div>
    {notice && <p aria-live="polite" className="relative mt-4 rounded-xl border border-brand/20 bg-brand/[.07] px-4 py-3 text-sm text-brand">{notice}</p>}
    <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-5"><p className="text-xs text-slate-600">Les estimations deviennent plus précises à mesure que JARVIS apprend de tes résultats.</p><Link href="/analytics" className="inline-flex items-center gap-2 text-xs text-brand">Voir les gains <Icon name="arrow" size={14}/></Link></div>
  </section>;
}

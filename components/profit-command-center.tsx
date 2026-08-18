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
    <div className="relative flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Profit command center</p><h2 id="profit-title" className="mt-1 text-xl font-semibold">Le meilleur usage de ton temps, aujourd’hui</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">JARVIS classe les actions selon leur valeur, leur urgence et l’effort nécessaire.</p></div>
      <div className="flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[.07] px-3 py-2 text-xs text-brand"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40"/><span className="relative inline-flex h-2 w-2 rounded-full bg-brand"/></span>Analyse active</div>
    </div>

    <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="profit-kpi"><span>Valeur du pipeline</span><strong>{euro(pipelineValue)}</strong><small>opportunités pondérées</small></article>
      <article className="profit-kpi"><span>Temps récupérable</span><strong>{hoursSaved.toLocaleString('fr-FR')} h</strong><small>sur les actions détectées</small></article>
      <article className="profit-kpi"><span>À valider</span><strong>{approvalCount}</strong><small>aucun envoi automatique</small></article>
      <article className="profit-kpi accent"><span>Score d’impact</span><strong>{opportunities[0]?.score ?? 0}/100</strong><small>meilleure action disponible</small></article>
    </div>

    <div className="relative mt-7 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer les opportunités">
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

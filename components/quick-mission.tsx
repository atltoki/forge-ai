'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';

export function QuickMission() {
  const [title, setTitle] = useState('Prospection ATLYN');
  const [objective, setObjective] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function launch(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, objective }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Mission impossible à lancer');
      setMessage('Mission lancée. Atlas recherche maintenant les informations.'); setObjective('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Mission impossible à lancer'); }
    finally { setSubmitting(false); }
  }

  return <form onSubmit={launch} className="constellation-panel overflow-hidden">
    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand/[.07] blur-3xl" aria-hidden="true" />
    <div className="relative flex items-start justify-between gap-3"><div><p className="eyebrow">Mission composer</p><h2 className="mt-1 text-lg font-semibold">Donner une mission à JARVIS</h2><p className="mt-1 text-xs text-slate-500">Atlas collecte, vérifie et structure les sources.</p></div><span className="live-signal"><span/>Atlas connecté</span></div>
    <div className="relative mt-6 grid gap-3"><div><label className="sr-only" htmlFor="quick-title">Nom</label><input id="quick-title" className="field border-white/[.07] bg-black/20" value={title} onChange={(event) => setTitle(event.target.value)} required /></div><div><label className="sr-only" htmlFor="quick-objective">Instruction</label><textarea id="quick-objective" className="field min-h-36 resize-y border-white/[.07] bg-black/20 text-base leading-7" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Décris la cible, le territoire et les informations à vérifier…" required /></div></div>
    <div className="relative mt-4 flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={submitting}>{submitting ? 'Lancement…' : <><Icon name="spark" /> Lancer avec Atlas</>}</button><Link href="/missions" className="btn-ghost">Historique <Icon name="arrow" size={15}/></Link></div>
    {message && <p className="mt-4 rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm text-brand">{message}</p>}{error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
  </form>;
}

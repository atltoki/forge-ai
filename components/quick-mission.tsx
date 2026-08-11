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

  return <form onSubmit={launch} className="card">
    <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Commande rapide</p><h2 className="mt-1 font-semibold">Donner une mission à JARVIS</h2></div><span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs text-brand">Atlas connecté</span></div>
    <div className="mt-5 grid gap-4"><div><label className="mb-2 block text-xs font-medium text-slate-400" htmlFor="quick-title">Nom</label><input id="quick-title" className="field" value={title} onChange={(event) => setTitle(event.target.value)} required /></div><div><label className="mb-2 block text-xs font-medium text-slate-400" htmlFor="quick-objective">Instruction</label><textarea id="quick-objective" className="field min-h-28 resize-y" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Ex. Trouve 20 distributeurs spécialisés en France et vérifie leurs sites…" required /></div></div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={submitting}>{submitting ? 'Lancement…' : <><Icon name="target" /> Exécuter</>}</button><Link href="/missions" className="btn-muted">Voir les missions</Link></div>
    {message && <p className="mt-4 rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm text-brand">{message}</p>}{error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
  </form>;
}

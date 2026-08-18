'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';

type GoogleStatus = { configured: boolean; connected: boolean; authenticated: boolean; email?: string | null };

const automations = [
  { id: 'gmail', icon: 'mail', title: 'Boîte mail intelligente', detail: 'Trie les messages et prépare des brouillons sans jamais les envoyer.' },
  { id: 'all', icon: 'brain', title: 'Carnet de bord', detail: 'Résume les réunions, mails envoyés et fichiers réellement modifiés.' },
  { id: 'drive', icon: 'drive', title: 'Rangement Drive', detail: 'Analyse les fichiers Drive récents sans jamais rien supprimer automatiquement.' },
  { id: 'calendar', icon: 'calendar', title: 'Brief avant réunion', detail: 'Prépare le contexte, les échanges récents et les engagements ouverts.' },
];

export function GoogleAutomations() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function refresh() { const response = await fetch('/api/google/status', { cache: 'no-store' }); setStatus(await response.json()); }
  useEffect(() => { void refresh(); }, []);

  async function disconnect() {
    setBusy(true);
    await fetch('/api/google/status', { method: 'DELETE' });
    await refresh();
    setBusy(false);
  }

  async function sync(service: string) {
    setSyncing(service); setMessage('');
    try { const response = await fetch('/api/google/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Synchronisation impossible'); setMessage(`${payload.synced} source${payload.synced > 1 ? 's' : ''} synchronisée${payload.synced > 1 ? 's' : ''}. La mémoire de JARVIS est à jour.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Synchronisation impossible'); }
    finally { setSyncing(null); }
  }

  return <section className="card mt-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Automatisations Google</p><h2 className="mt-1 text-xl font-semibold">Une autorisation, quatre assistants</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Forge AI demande uniquement les accès nécessaires. Les brouillons restent à valider et aucun fichier n’est supprimé automatiquement.</p></div>
      {status?.connected ? <button className="btn-muted" disabled={busy} onClick={() => void disconnect()}>Déconnecter {status.email || 'Google'}</button> : <a className={`btn-primary ${status && !status.configured ? 'pointer-events-none opacity-50' : ''}`} href="/api/google/connect"><Icon name="plus" /> Connecter Google</a>}
    </div>
    {status && !status.configured && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100">Le bouton est prêt. L’administrateur doit encore ajouter l’identifiant et le secret OAuth Google dans Vercel.</p>}
    <div className="mt-6 grid gap-3 md:grid-cols-2">{automations.map((item) => <article key={item.title} className="rounded-2xl border border-line bg-white/[.025] p-4 transition hover:border-brand/20"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/[.08] text-brand"><Icon name={item.icon} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] ${status?.connected ? 'bg-brand/10 text-brand' : 'bg-white/5 text-slate-500'}`}>{status?.connected ? 'Prêt' : 'Google requis'}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>{status?.connected && <button className="btn-ghost mt-3 !min-h-9 !px-0 text-xs" disabled={Boolean(syncing)} onClick={() => void sync(item.id)}>{syncing === item.id ? 'Analyse…' : <>Analyser maintenant <Icon name="arrow" size={14}/></>}</button>}</div></div></article>)}</div>
    {message && <p aria-live="polite" className="mt-4 rounded-xl border border-brand/20 bg-brand/[.07] p-3 text-sm text-brand">{message}</p>}
  </section>;
}

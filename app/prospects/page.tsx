'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/shell';
import { Icon } from '@/components/icons';
import { mailtoUrl } from '@/lib/domain/outreach';

type ProspectStatus = 'new' | 'qualified' | 'contacted' | 'interested' | 'won' | 'archived';
type Prospect = {
  id: string;
  company_name: string;
  website: string;
  city: string;
  activity: string;
  qualification: string;
  contact_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  source_url: string;
  score: number;
  status: ProspectStatus;
  notes: string;
  follow_up_at: string | null;
  created_at: string;
  missions?: { title?: string } | null;
  outreach_messages?: OutreachMessage[];
};

type OutreachMessage = {
  id: string;
  step: number;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'replied' | 'skipped';
  scheduled_at: string;
  sent_at: string | null;
};

const stages: Array<{ id: ProspectStatus; label: string; detail: string }> = [
  { id: 'new', label: 'Nouveaux', detail: 'À examiner' },
  { id: 'qualified', label: 'Qualifiés', detail: 'Bonne adéquation' },
  { id: 'contacted', label: 'Contactés', detail: 'Prise de contact' },
  { id: 'interested', label: 'Intéressés', detail: 'À convertir' },
  { id: 'won', label: 'Gagnés', detail: 'Opportunités' },
];

function csvValue(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

function DraftMessage({ email, message, busy, onSave, onSent, onNotice }: {
  email: string;
  message: OutreachMessage;
  busy: boolean;
  onSave: (subject: string, body: string) => Promise<void>;
  onSent: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const changed = subject !== message.subject || body !== message.body;

  return <details className="mt-3 rounded-xl border border-line bg-black/10 p-3">
    <summary className="cursor-pointer list-none text-sm font-medium text-white">Message {message.step} · {new Date(message.scheduled_at).toLocaleDateString('fr-FR')}</summary>
    <label className="mt-3 block text-xs text-slate-500" htmlFor={`outreach-subject-${message.id}`}>Objet</label><input id={`outreach-subject-${message.id}`} className="field mt-1 !py-2.5" value={subject} onChange={(event) => setSubject(event.target.value)}/>
    <label className="mt-3 block text-xs text-slate-500" htmlFor={`outreach-body-${message.id}`}>Message</label><textarea id={`outreach-body-${message.id}`} className="field mt-1 min-h-52 resize-y text-sm leading-6" value={body} onChange={(event) => setBody(event.target.value)}/>
    <div className="mt-4 flex flex-wrap gap-2">{changed && <button type="button" className="btn-muted !min-h-9 !px-3 !py-2" disabled={busy || !subject.trim() || !body.trim()} onClick={() => void onSave(subject, body)}><Icon name="check" size={14}/>Enregistrer</button>}<a className="btn-primary !min-h-9 !px-3 !py-2" href={mailtoUrl(email, subject, body)}><Icon name="mail" size={14}/>Ouvrir l’e-mail</a><button type="button" className="btn-muted !min-h-9 !px-3 !py-2" onClick={() => void navigator.clipboard.writeText(`${subject}\n\n${body}`).then(() => onNotice('Message copié.')).catch(() => onNotice('Copie impossible dans ce navigateur.'))}><Icon name="copy" size={14}/>Copier</button><button type="button" className="btn-muted !min-h-9 !px-3 !py-2" disabled={busy} onClick={() => void onSent()}><Icon name="check" size={14}/>Marquer envoyé</button></div>
  </details>;
}

function OutreachComposer({ prospect, busy, onPrepare, onAction, onSave, onNotice }: {
  prospect: Prospect;
  busy: boolean;
  onPrepare: () => Promise<void>;
  onAction: (messageId: string, action: 'sent' | 'replied') => Promise<void>;
  onSave: (messageId: string, subject: string, body: string) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const messages = [...(prospect.outreach_messages ?? [])].sort((a, b) => a.step - b.step);
  const next = messages.find((message) => message.status === 'draft');
  const lastSent = [...messages].reverse().find((message) => message.status === 'sent');
  const sentCount = messages.filter((message) => message.status === 'sent' || message.status === 'replied').length;

  if (!prospect.email) return <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-xs text-amber-100/70">Ajoute un e-mail professionnel pour activer la séquence.</div>;
  if (!messages.length) return <button type="button" className="btn-primary mt-5 w-full" disabled={busy} onClick={() => void onPrepare()}><Icon name="spark" size={16}/>{busy ? 'Préparation…' : 'Préparer 3 messages'}</button>;

  return <div className="mt-5 rounded-2xl border border-brand/15 bg-brand/[.035] p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-brand">Séquence ATLYN</p><p className="mt-1 text-[11px] text-slate-500">{sentCount}/3 message{sentCount > 1 ? 's' : ''} envoyé{sentCount > 1 ? 's' : ''}</p></div>{lastSent && prospect.status !== 'interested' && <button type="button" className="btn-muted !min-h-8 !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => void onAction(lastSent.id, 'replied')}>Réponse reçue</button>}</div>
    {next ? <DraftMessage email={prospect.email} message={next} busy={busy} onSave={(subject, body) => onSave(next.id, subject, body)} onSent={() => onAction(next.id, 'sent')} onNotice={onNotice}/> : <p className="mt-3 text-sm text-slate-400">Séquence terminée. En attente d’une réponse.</p>}
  </div>;
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | ProspectStatus>('all');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/prospects', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Prospects indisponibles');
    setProspects(payload.data ?? []);
    return (payload.data ?? []).length as number;
  }, []);

  const sync = useCallback(async (silent = false) => {
    setSyncing(true);
    try {
      const response = await fetch('/api/prospects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Synchronisation impossible');
      await load();
      if (!silent) setNotice(`${payload.imported ?? 0} prospect${payload.imported > 1 ? 's' : ''} synchronisé${payload.imported > 1 ? 's' : ''}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Synchronisation impossible');
    } finally { setSyncing(false); }
  }, [load]);

  useEffect(() => {
    load().then((count) => count === 0 ? sync(true) : undefined).catch((error) => setNotice(error instanceof Error ? error.message : 'Prospects indisponibles')).finally(() => setLoading(false));
  }, [load, sync]);

  async function updateProspect(id: string, updates: { status?: ProspectStatus; notes?: string; followUpAt?: string | null; contactName?: string; email?: string; phone?: string }) {
    setBusyId(id);
    try {
      const response = await fetch('/api/prospects', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Mise à jour impossible');
      await load();
      setNotice('Suivi enregistré.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Mise à jour impossible'); }
    finally { setBusyId(null); }
  }

  async function enrichProspect(prospectId: string) {
    setBusyId(prospectId);
    try {
      const response = await fetch('/api/prospects/enrich', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prospectId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Enrichissement impossible');
      await load();
      setNotice(payload.found ? 'Coordonnées professionnelles trouvées.' : 'Aucune coordonnée publique fiable trouvée. Tu peux la saisir manuellement.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Enrichissement impossible'); }
    finally { setBusyId(null); }
  }

  async function prepareOutreach(prospectId: string) {
    setBusyId(prospectId);
    try {
      const response = await fetch('/api/outreach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prospectId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Séquence impossible');
      await load();
      setNotice('Trois messages personnalisés sont prêts.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Séquence impossible'); }
    finally { setBusyId(null); }
  }

  async function updateOutreach(prospectId: string, messageId: string, action: 'sent' | 'replied') {
    setBusyId(prospectId);
    try {
      const response = await fetch('/api/outreach', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: messageId, action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Action impossible');
      await load();
      setNotice(action === 'sent' ? 'Envoi enregistré et relance programmée.' : 'Réponse enregistrée. Le prospect passe en « Intéressé ».');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Action impossible'); }
    finally { setBusyId(null); }
  }

  async function saveOutreach(prospectId: string, messageId: string, subject: string, message: string) {
    setBusyId(prospectId);
    try {
      const response = await fetch('/api/outreach', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: messageId, action: 'save', subject, message }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Enregistrement impossible');
      await load();
      setNotice('Message personnalisé enregistré.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Enregistrement impossible'); }
    finally { setBusyId(null); }
  }

  const filtered = useMemo(() => prospects.filter((prospect) => {
    const haystack = `${prospect.company_name} ${prospect.city} ${prospect.activity} ${prospect.qualification}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === 'all' || prospect.status === status);
  }), [prospects, query, status]);

  function exportCsv() {
    const headers = ['Entreprise', 'Score', 'Statut', 'Site', 'Ville', 'Activité', 'Qualification', 'Contact', 'Email', 'Téléphone', 'LinkedIn', 'Source', 'Relance', 'Notes'];
    const rows = filtered.map((prospect) => [prospect.company_name, prospect.score, prospect.status, prospect.website, prospect.city, prospect.activity, prospect.qualification, prospect.contact_name, prospect.email, prospect.phone, prospect.linkedin_url, prospect.source_url, prospect.follow_up_at ?? '', prospect.notes]);
    const content = [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'prospects-atlyn.csv'; link.click(); URL.revokeObjectURL(url);
  }

  return <Shell title="Prospection ATLYN">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Pipeline commercial">
      {stages.map((stage) => <button key={stage.id} type="button" onClick={() => setStatus(stage.id)} className={`metric-tile text-left ${status === stage.id ? '!border-brand/30' : ''}`}><p className="text-xs text-slate-500">{stage.label}</p><p className="mt-2 text-3xl font-semibold text-white">{prospects.filter((prospect) => prospect.status === stage.id).length}</p><p className="mt-2 text-[11px] text-slate-600">{stage.detail}</p></button>)}
    </section>

    <section className="constellation-panel mt-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Sales pipeline</p><h2 className="mt-1 text-xl font-semibold">Prospects vérifiés par Atlas</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Qualifie les entreprises, prépare la prise de contact et programme la prochaine action.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-muted" onClick={() => void sync()} disabled={syncing}><Icon name="retry" size={16}/>{syncing ? 'Synchronisation…' : 'Synchroniser les missions'}</button><button type="button" className="btn-primary" onClick={exportCsv} disabled={!filtered.length}><Icon name="download" size={16}/>Exporter CSV</button></div></div>
      {notice && <div className="mt-4 flex items-center justify-between rounded-xl border border-brand/20 bg-brand/[.06] p-3 text-sm text-brand" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Fermer">×</button></div>}
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Icon name="search" size={16}/></span><input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Entreprise, ville, activité…" aria-label="Rechercher un prospect"/></div><select className="field" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filtrer par statut"><option value="all">Tous les statuts</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}<option value="archived">Archivés</option></select></div>
    </section>

    <section className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" aria-live="polite">
      {loading ? <div className="card col-span-full py-12 text-center text-sm text-slate-400">Chargement du pipeline…</div> : filtered.map((prospect) => <article key={prospect.id} className="constellation-panel flex flex-col">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-slate-600">{prospect.missions?.title ?? 'Mission ATLYN'}</p><h3 className="mt-2 truncate text-lg font-semibold">{prospect.company_name}</h3><p className="mt-1 text-sm text-slate-500">{[prospect.city, prospect.activity].filter(Boolean).join(' · ') || 'Informations à compléter'}</p></div><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border font-mono text-sm ${prospect.score >= 70 ? 'border-brand/25 bg-brand/10 text-brand' : 'border-amber-300/20 bg-amber-300/[.07] text-amber-200'}`}>{prospect.score}</span></div>
        {prospect.qualification && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">{prospect.qualification}</p>}
        <div className="mt-5 flex flex-wrap gap-2">{prospect.website && <a href={prospect.website} target="_blank" rel="noreferrer" className="btn-muted !min-h-9 !px-3 !py-2"><Icon name="arrow" size={14}/>Site</a>}{prospect.email && <a href={`mailto:${prospect.email}`} className="btn-muted !min-h-9 !px-3 !py-2"><Icon name="mail" size={14}/>Email</a>}{prospect.phone && <a href={`tel:${prospect.phone}`} className="btn-muted !min-h-9 !px-3 !py-2"><Icon name="phone" size={14}/>Appeler</a>}{prospect.linkedin_url && <a href={prospect.linkedin_url} target="_blank" rel="noreferrer" className="btn-muted !min-h-9 !px-3 !py-2">LinkedIn</a>}</div>
        <details className="mt-4 rounded-xl border border-line p-3"><summary className="cursor-pointer list-none text-xs text-slate-400">Coordonnées professionnelles</summary><div className="mt-3 grid gap-2"><input className="field !py-2.5" defaultValue={prospect.contact_name} placeholder="Nom du contact" aria-label={`Contact ${prospect.company_name}`} onBlur={(event) => { if (event.target.value !== prospect.contact_name) void updateProspect(prospect.id, { contactName: event.target.value }); }}/><input className="field !py-2.5" type="email" defaultValue={prospect.email} placeholder="E-mail professionnel" aria-label={`E-mail ${prospect.company_name}`} onBlur={(event) => { if (event.target.value !== prospect.email) void updateProspect(prospect.id, { email: event.target.value }); }}/><input className="field !py-2.5" type="tel" defaultValue={prospect.phone} placeholder="Téléphone" aria-label={`Téléphone ${prospect.company_name}`} onBlur={(event) => { if (event.target.value !== prospect.phone) void updateProspect(prospect.id, { phone: event.target.value }); }}/>{!prospect.email && <button type="button" className="btn-muted mt-1 w-full" disabled={busyId === prospect.id} onClick={() => void enrichProspect(prospect.id)}><Icon name="spark" size={15}/>{busyId === prospect.id ? 'Recherche…' : 'Rechercher les coordonnées publiques'}</button>}</div></details>
        <OutreachComposer prospect={prospect} busy={busyId === prospect.id} onPrepare={() => prepareOutreach(prospect.id)} onAction={(messageId, action) => updateOutreach(prospect.id, messageId, action)} onSave={(messageId, subject, body) => saveOutreach(prospect.id, messageId, subject, body)} onNotice={setNotice}/>
        <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2"><div><label className="mb-2 block text-xs text-slate-500" htmlFor={`status-${prospect.id}`}>Étape</label><select id={`status-${prospect.id}`} className="field !py-2.5" value={prospect.status} disabled={busyId === prospect.id} onChange={(event) => void updateProspect(prospect.id, { status: event.target.value as ProspectStatus })}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}<option value="archived">Archivé</option></select></div><div><label className="mb-2 block text-xs text-slate-500" htmlFor={`follow-${prospect.id}`}>Prochaine relance</label><input id={`follow-${prospect.id}`} type="date" className="field !py-2.5" value={prospect.follow_up_at?.slice(0, 10) ?? ''} disabled={busyId === prospect.id} onChange={(event) => void updateProspect(prospect.id, { followUpAt: event.target.value ? new Date(`${event.target.value}T09:00:00`).toISOString() : null })}/></div></div>
        <div className="mt-3"><label className="mb-2 block text-xs text-slate-500" htmlFor={`notes-${prospect.id}`}>Notes commerciales</label><textarea id={`notes-${prospect.id}`} className="field min-h-20 resize-y" defaultValue={prospect.notes} placeholder="Décisionnaire, contexte, prochaine action…" onBlur={(event) => { if (event.target.value !== prospect.notes) void updateProspect(prospect.id, { notes: event.target.value }); }}/></div>
        {prospect.source_url && <a className="mt-4 truncate text-xs text-brand hover:underline" href={prospect.source_url} target="_blank" rel="noreferrer">Voir la source publique</a>}
      </article>)}
      {!loading && !filtered.length && <div className="card col-span-full py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><Icon name="users"/></span><h3 className="mt-4 font-semibold">Aucun prospect dans cette vue</h3><p className="mt-2 text-sm text-slate-400">Lance une mission ou synchronise les résultats existants.</p></div>}
    </section>
  </Shell>;
}

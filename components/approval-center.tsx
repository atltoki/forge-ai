'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './icons';
import { mailtoUrl } from '@/lib/domain/outreach';

type Approval = { id: string; step: number; subject: string; body: string; status: 'draft' | 'approved'; scheduled_at: string; prospects: { company_name: string; contact_name: string; email: string; score: number } | Array<{ company_name: string; contact_name: string; email: string; score: number }> };

export function ApprovalCenter() {
  const [items, setItems] = useState<Approval[]>([]); const [selected, setSelected] = useState<string | null>(null); const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [busy, setBusy] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { const response = await fetch('/api/outreach', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setItems(payload.data ?? []); setSelected((current) => current && payload.data?.some((item: Approval) => item.id === current) ? current : payload.data?.[0]?.id ?? null); }, []);
  useEffect(() => { void load().catch((error) => setNotice(error.message)); }, [load]);
  const current = useMemo(() => items.find((item) => item.id === selected) ?? null, [items, selected]);
  useEffect(() => { if (current) { setSubject(current.subject); setBody(current.body); } }, [current]);
  async function action(actionName: 'save' | 'approved' | 'skipped' | 'sent') { if (!current) return; setBusy(actionName); setNotice(''); const response = await fetch('/api/outreach', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: current.id, action: actionName, subject, message: body }) }); const payload = await response.json(); setBusy(''); if (!response.ok) return setNotice(payload.error ?? 'Action impossible'); setNotice(actionName === 'approved' ? 'Message approuvé. Il est prêt à être envoyé.' : actionName === 'skipped' ? 'Message refusé et archivé.' : actionName === 'sent' ? 'Envoi enregistré.' : 'Modifications enregistrées.'); await load(); }
  const prospect = current ? (Array.isArray(current.prospects) ? current.prospects[0] : current.prospects) : null;
  return <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
    <aside className="constellation-panel">
      <div className="flex items-end justify-between"><div><p className="eyebrow">File d’attente</p><h2 className="mt-1 text-lg font-semibold">{items.length} à examiner</h2></div><span className="live-signal"><span/>Sécurisé</span></div>
      <div className="mt-5 grid gap-2">
        {items.map((item) => { const company = Array.isArray(item.prospects) ? item.prospects[0] : item.prospects; return <button key={item.id} onClick={() => setSelected(item.id)} className={`approval-item ${selected === item.id ? 'active' : ''}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${item.status === 'approved' ? 'bg-brand/10 text-brand' : 'bg-violet-400/10 text-violet-300'}`}><Icon name={item.status === 'approved' ? 'check' : 'mail'} size={16}/></span><span className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm font-medium">{company?.company_name}</strong><small className="mt-1 block text-slate-600">Message {item.step} · {item.status === 'approved' ? 'approuvé' : 'brouillon'}</small></span><Icon name="chevron" size={14}/></button>; })}
        {!items.length && <p className="py-12 text-center text-sm text-slate-500">Aucun message en attente.</p>}
      </div>
    </aside>
    <section className="constellation-panel min-h-[34rem]">
      {current && prospect ? <>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Validation humaine</p><h2 className="mt-1 text-xl font-semibold">{prospect.company_name}</h2><p className="mt-2 text-sm text-slate-500">À : {prospect.contact_name || 'Contact'} · {prospect.email}</p></div><span className={`opportunity-type ${current.status === 'approved' ? 'revenu' : 'approval'}`}>{current.status === 'approved' ? 'approuvé' : 'à valider'}</span></div>
        <label className="mt-6 block text-xs text-slate-500">Objet<input className="field mt-2" value={subject} onChange={(e) => setSubject(e.target.value)}/></label>
        <label className="mt-4 block text-xs text-slate-500">Message<textarea className="field mt-2 min-h-64 resize-y leading-7" value={body} onChange={(e) => setBody(e.target.value)}/></label>
        <div className="mt-5 flex flex-wrap gap-2"><button className="btn-muted" disabled={Boolean(busy)} onClick={() => void action('save')}><Icon name="check" size={15}/>Enregistrer</button>{current.status === 'draft' ? <button className="btn-primary" disabled={Boolean(busy)} onClick={() => void action('approved')}><Icon name="shield" size={15}/>Approuver</button> : <><a className="btn-primary" href={mailtoUrl(prospect.email, subject, body)}><Icon name="mail" size={15}/>Ouvrir dans Gmail</a><button className="btn-muted" disabled={Boolean(busy)} onClick={() => void action('sent')}><Icon name="check" size={15}/>Marquer envoyé</button></>}<button className="btn-ghost text-red-300" disabled={Boolean(busy)} onClick={() => void action('skipped')}><Icon name="trash" size={15}/>Refuser</button></div>
        {notice && <p className="mt-4 rounded-xl border border-brand/20 bg-brand/[.07] p-3 text-sm text-brand">{notice}</p>}
      </> : <div className="grid min-h-[30rem] place-items-center text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><Icon name="shield" size={22}/></span><h2 className="mt-4 font-semibold">File de validation vide</h2><p className="mt-2 text-sm text-slate-500">Prépare une séquence depuis Opportunités pour la voir ici.</p></div></div>}
    </section>
  </div>;
}

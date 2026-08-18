'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

const productCopy: Record<string, { label:string; title:string; intro:string; offer:string; target:string }> = {
  'forgem': { label:'Forgem', title:'Préparons ton kit de marque', intro:'Donne-nous le contexte nécessaire pour produire une identité vraiment exploitable.', offer:'Décris ton activité, ton produit et ce que ta marque doit faire ressentir.', target:'À qui s’adresse ta marque ?' },
  'ugc-engine': { label:'UGC Engine', title:'Préparons ton studio vidéo', intro:'Ton brief devient la base de toutes tes campagnes produit.', offer:'Décris le produit à promouvoir, ses bénéfices et ton appel à l’action.', target:'Qui doit acheter ce produit ?' },
  'kern-inbox': { label:'KERN Inbox', title:'Cartographions tes opérations', intro:'Nous préparons une installation adaptée à tes emails et procédures.', offer:'Quels emails, demandes et processus veux-tu automatiser ?', target:'Quelles équipes ou quels clients sont concernés ?' },
  'atlyn': { label:'ATLYN', title:'Apprends ton activité à JARVIS', intro:'Ces informations déterminent qui cibler et comment présenter ton offre.', offer:'Résultat livré, délai, différence…', target:'Décris ton client idéal.' },
};

export function ClientOnboarding({ product='atlyn' }:{ product?:string }) {
  const router=useRouter(); const copy=productCopy[product]||productCopy.atlyn;
  const [form,setForm]=useState({business_name:'',offer:'',target_customer:'',average_deal_value:product==='forgem'?29:product==='ugc-engine'?59:1000,tone:'professionnel et direct',product_key:product});
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');const r=await fetch('/api/onboarding',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});const p=await r.json();setBusy(false);if(!r.ok)return setError(p.error);router.push('/client');}
  return <form onSubmit={submit} className="constellation-panel mx-auto max-w-3xl">
    <div className="flex items-center justify-between"><p className="eyebrow">Configuration guidée · {copy.label}</p><span className="live-signal"><span/>Achat sécurisé</span></div>
    <h2 className="mt-3 text-2xl font-semibold">{copy.title}</h2><p className="mt-2 text-sm text-slate-500">{copy.intro}</p>
    <div className="mt-7 grid gap-5">
      <label className="text-xs text-slate-500">Nom de l’activité ou de la marque<input className="field mt-2" value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})} required/></label>
      <label className="text-xs text-slate-500">{copy.offer}<textarea className="field mt-2 min-h-28" value={form.offer} onChange={e=>setForm({...form,offer:e.target.value})} required/></label>
      <label className="text-xs text-slate-500">{copy.target}<textarea className="field mt-2 min-h-28" value={form.target_customer} onChange={e=>setForm({...form,target_customer:e.target.value})} required/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-slate-500">Valeur moyenne d’une vente (€)<input type="number" className="field mt-2" value={form.average_deal_value} onChange={e=>setForm({...form,average_deal_value:Number(e.target.value)})}/></label><label className="text-xs text-slate-500">Ton de communication<select className="field mt-2" value={form.tone} onChange={e=>setForm({...form,tone:e.target.value})}><option>professionnel et direct</option><option>chaleureux et accessible</option><option>premium et concis</option></select></label></div>
    </div>
    <button className="btn-primary mt-7 w-full" disabled={busy}>{busy?'Préparation…':<>Ouvrir mon espace {copy.label} <Icon name="arrow"/></>}</button>{error&&<p className="mt-4 text-sm text-red-300">{error}</p>}
  </form>;
}

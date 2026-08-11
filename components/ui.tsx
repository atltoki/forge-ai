import { Icon } from './icons';
import Link from 'next/link';

export function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="card"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-mint">{detail}</p></div>;
}

export function Progress({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue} aria-label={`Progression : ${safeValue} %`}><div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${safeValue}%` }} /></div>;
}

export function Empty({ title, copy }: { title: string; copy: string }) {
  return <div className="card py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-violet-300"><Icon name="plus" /></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{copy}</p><Link href="/missions" className="btn-primary mt-5">Créer une mission</Link></div>;
}

export function StatusBadge({ value }: { value: string }) {
  const labels: Record<string, string> = {
    queued: 'En attente', planning: 'Préparation', running: 'Recherche en cours', review: 'À vérifier', completed: 'Terminée', failed: 'Échec',
    enabled: 'Actif', active: 'Actif', idle: 'Disponible', paused: 'En pause', error: 'Erreur', disabled: 'Désactivé', needs_config: 'À configurer', warning: 'Attention',
  };
  const tone = value === 'enabled' || value === 'active' || value === 'completed'
    ? 'border-mint/20 bg-mint/10 text-mint'
    : value === 'failed' || value === 'error'
      ? 'border-red-400/20 bg-red-500/10 text-red-300'
      : value === 'running' || value === 'planning'
        ? 'border-brand/20 bg-brand/10 text-brand'
        : value === 'needs_config' || value === 'warning' || value === 'review'
          ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
          : 'border-white/5 bg-white/5 text-slate-400';

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{labels[value] ?? value.replaceAll('_', ' ')}</span>;
}

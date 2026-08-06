import { Icon } from './icons';

export function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="card"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-mint">{detail}</p></div>;
}

export function Progress({ value }: { value: number }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} /></div>;
}

export function Empty({ title, copy }: { title: string; copy: string }) {
  return <div className="card py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-violet-300"><Icon name="plus" /></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{copy}</p><button className="btn-primary mt-5">Create mission</button></div>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone = value === 'enabled' || value === 'active' || value === 'completed'
    ? 'bg-mint/10 text-mint'
    : value === 'needs_config' || value === 'warning' || value === 'review'
      ? 'bg-amber-400/10 text-amber-300'
      : 'bg-white/5 text-slate-400';

  return <span className={`rounded-full px-2.5 py-1 text-xs ${tone}`}>{value.replace('_', ' ')}</span>;
}

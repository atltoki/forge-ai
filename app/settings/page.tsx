'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { GoogleAutomations } from '@/components/google-automations';

type Service = { id: string; name: string; ready: boolean; healthy?: boolean; detail: string };

const dashboards: Record<string, string> = {
  supabase: 'https://supabase.com/dashboard/project/iucgqydobafslvoubtnz',
  worker: 'https://dash.cloudflare.com/',
  openai: 'https://platform.openai.com/api-keys',
  vercel: 'https://vercel.com/allantchicaya-8955s-projects/forge-ai',
};

export default function SettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');

  async function refresh() {
    setError('');
    try {
      const response = await fetch('/api/settings/status', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Diagnostic impossible');
      setServices(payload.services ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Diagnostic impossible');
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <Shell title="Settings">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-slate-400">État réel des services utilisés par FORGE AI. Aucun statut n’est simulé.</p>
        <button className="btn-muted" onClick={() => void refresh()}>Actualiser le diagnostic</button>
      </div>
      {error && <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      <div className="space-y-4">
        {services.length ? services.map((service) => (
          <section key={service.id} className="card flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="font-semibold">{service.name}</h2><p className="mt-1 text-sm text-slate-400">{service.detail}</p></div>
            <div className="flex items-center gap-4">
              <StatusBadge value={service.ready ? (service.healthy === false ? 'warning' : 'enabled') : 'needs_config'} />
              {dashboards[service.id] && <a className="btn-muted" href={dashboards[service.id]} target="_blank" rel="noreferrer">Ouvrir</a>}
            </div>
          </section>
        )) : <p className="card text-sm text-slate-400">Diagnostic en cours…</p>}
      </div>
      <GoogleAutomations />
    </Shell>
  );
}

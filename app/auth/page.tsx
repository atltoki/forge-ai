'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Vérification de la configuration Supabase...');
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => {
        setIsReady(true);
        setIsConnected(Boolean(data.user));
        setStatus(data.user ? `Connecté avec ${data.user.email}` : 'Supabase Auth est prêt. Envoie-toi un lien magique.');
      });
    } catch {
      setStatus('Supabase n’est pas encore configuré. Ajoute l’URL publique et la clé anon dans Vercel.');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const supabase = createSupabaseBrowserClient();
      const requestedNext = new URLSearchParams(window.location.search).get('next') ?? '/missions';
      const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/missions';
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });

      setStatus(error ? error.message : 'Lien magique envoyé. Vérifie ton email.');
    } catch {
      setStatus('Supabase n’est pas encore configuré.');
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsConnected(false);
    setStatus('Déconnecté.');
  }

  return (
    <Shell title="Auth">
      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="card">
          <p className="eyebrow">Identity layer</p>
          <h2 className="mt-2 text-xl font-semibold">Supabase Auth</h2>
          <p className="mt-4 max-w-2xl text-sm text-slate-400">
            L’authentification se branche sur Supabase. Elle deviendra la porte d’entrée des workspaces, des permissions d’agents et des données isolées par utilisateur.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {['User session', 'RLS policies', 'Workspace profile'].map((item) => (
              <div key={item} className="rounded-lg border border-line bg-white/[0.03] p-4 text-sm">{item}</div>
            ))}
          </div>
          <a href="/welcome" className="btn-muted mt-6 inline-flex">Découvrir FORGE AI</a>
        </div>
        <form onSubmit={submit} className="card">
          <p className="eyebrow">Sign in</p>
          <label className="mt-5 block text-sm text-slate-400" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-[#101114] px-3 py-2.5 text-sm outline-none focus:border-brand"
            placeholder="you@company.com"
            required
          />
          {isConnected ? (
            <div className="mt-4 flex gap-3">
              <a className="btn-primary flex-1 justify-center" href="/missions">Ouvrir FORGE AI</a>
              <button type="button" className="btn-muted" onClick={signOut}>Déconnexion</button>
            </div>
          ) : (
            <button className="btn-primary mt-4 w-full justify-center" disabled={!isReady}>Envoyer le lien magique</button>
          )}
          <p className="mt-4 text-sm text-slate-400">{status}</p>
        </form>
      </section>
    </Shell>
  );
}

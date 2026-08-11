'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

const commands = [
  { label: 'Pilotage', description: 'Vue stratégique ATLYN', href: '/', icon: 'grid' },
  { label: 'Cockpit JARVIS', description: 'Agents, outils et exécutions', href: '/cockpit', icon: 'bot' },
  { label: 'Nouvelle mission', description: 'Lancer une recherche Atlas', href: '/missions', icon: 'target' },
  { label: 'Mémoire', description: 'Résultats et savoir persistants', href: '/memory', icon: 'brain' },
  { label: 'Journal', description: 'Événements du réseau', href: '/logs', icon: 'logs' },
  { label: 'Réglages', description: 'Connexions et configuration', href: '/settings', icon: 'gear' },
];

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => commands.filter((command) => `${command.label} ${command.description}`.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()); }, [open]);

  function select(href: string) {
    setOpen(false); setQuery(''); router.push(href);
  }

  return <>
    <button type="button" className="command-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span className="flex min-w-0 items-center gap-3"><Icon name="search" size={17} /><span className="truncate">Rechercher ou donner une commande…</span></span>
      <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-500 sm:inline">⌘ K</kbd>
    </button>

    {open && <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#15161b] shadow-[0_32px_100px_rgba(0,0,0,.65)]" role="dialog" aria-modal="true" aria-label="Palette de commandes">
        <label className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Icon name="search" />
          <span className="sr-only">Rechercher une commande</span>
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filtered[0]) select(filtered[0].href); }} className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600" placeholder="Où souhaitez-vous aller ?" />
          <kbd className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500">ESC</kbd>
        </label>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.map((command, index) => <button type="button" key={command.href} onClick={() => select(command.href)} className={`flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[.06] ${index === 0 ? 'bg-white/[.035]' : ''}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-brand"><Icon name={command.icon} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-100">{command.label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{command.description}</span></span>
            <Icon name="chevron" size={15} />
          </button>)}
          {!filtered.length && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucune commande trouvée.</p>}
        </div>
        <footer className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[11px] text-slate-600"><span>FORGE Command</span><span>Entrée pour ouvrir</span></footer>
      </section>
    </div>}
  </>;
}

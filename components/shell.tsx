'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { CommandPalette } from './command-palette';

const links = [
  ['Pilotage', '/dashboard', 'grid'],
  ['Cockpit', '/cockpit', 'bot'],
  ['Agents', '/agents', 'bot'],
  ['Missions', '/missions', 'target'],
  ['Prospects', '/prospects', 'users'],
  ['Mémoire', '/memory', 'brain'],
  ['Outils', '/tools', 'wrench'],
  ['Journal', '/logs', 'logs'],
  ['Analyses', '/analytics', 'chart'],
  ['Réglages', '/settings', 'gear'],
];

const mobileLinks = [links[0], links[3], links[4], links[9]];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-[15.5rem] shrink-0 border-r border-white/[.06] bg-[#121317]/95 p-4 md:flex md:flex-col">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2 py-1" aria-label="Accueil FORGE AI">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand font-black text-[#192011] shadow-[0_0_28px_rgba(184,255,92,.18)]"><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#121317] bg-violet-400"/>F</span>
          <span><span className="block font-semibold tracking-[.08em]">FORGE <b className="text-brand">AI</b></span><span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[.18em] text-slate-600">Constellation OS</span></span>
        </Link>
        <p className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[.16em] text-slate-700">Workspace</p>
        <nav className="space-y-1" aria-label="Navigation principale">
          {links.map(([label, href, icon]) => (
            <Link key={href} href={href} className={`nav-link ${isActive(pathname, href) ? 'nav-link-active' : ''}`} aria-current={isActive(pathname, href) ? 'page' : undefined}>
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/[.06] bg-white/[.025] p-3 text-xs">
          <div className="flex items-center justify-between"><span className="font-medium text-slate-300">Réseau</span><span className="live-signal"><span/>Actif</span></div>
          <p className="mt-3 text-slate-600">ATLYN Workspace<br/>Propulsé par FORGE AI</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Accueil FORGE AI">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-black text-[#192011]">F</span>
            <span className="text-sm font-semibold tracking-[.08em]">FORGE <b className="text-brand">AI</b></span>
          </Link>
          <Link href="/missions" className="btn-primary !px-3 !py-2" aria-label="Créer une nouvelle mission"><Icon name="plus" size={16} /> Mission</Link>
        </div>

        <main className="mx-auto w-full max-w-[92rem] flex-1 p-4 pb-28 sm:p-6 md:p-8 md:pb-8 xl:px-10">
          <div className="mb-6 flex items-center gap-4"><div className="max-w-xl flex-1"><CommandPalette /></div><span className="ml-auto hidden md:inline-flex live-signal"><span/>Systèmes opérationnels</span></div>
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/[.06] pb-5 md:mb-7 md:pb-6">
            <div>
              <p className="eyebrow">Espace ATLYN</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-.025em] md:text-3xl">{title}</h1>
            </div>
            {pathname !== '/missions' && <Link href="/missions" className="btn-primary hidden md:inline-flex"><Icon name="plus" /> Nouvelle mission</Link>}
          </header>
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-[#141519]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden" aria-label="Navigation mobile">
          {mobileLinks.map(([label, href, icon]) => (
            <Link key={href} href={href} className={`mobile-nav-link ${isActive(pathname, href) ? 'mobile-nav-link-active' : ''}`} aria-current={isActive(pathname, href) ? 'page' : undefined}>
              <Icon name={icon} size={20} />
              <span>{label === 'Pilotage' ? 'Accueil' : label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

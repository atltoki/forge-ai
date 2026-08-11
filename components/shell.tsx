'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';

const links = [
  ['Tableau de bord', '/', 'grid'],
  ['Agents', '/agents', 'bot'],
  ['Missions', '/missions', 'target'],
  ['Mémoire', '/memory', 'brain'],
  ['Outils', '/tools', 'wrench'],
  ['Journal', '/logs', 'logs'],
  ['Analyses', '/analytics', 'chart'],
  ['Réglages', '/settings', 'gear'],
];

const mobileLinks = [links[0], links[2], links[1], links[7]];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-[#141519] p-5 md:flex md:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2" aria-label="Accueil FORGE AI">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-black text-[#192011]">F</span>
          <span className="font-semibold tracking-[.08em]">FORGE <b className="text-brand">AI</b></span>
        </Link>
        <nav className="space-y-1" aria-label="Navigation principale">
          {links.map(([label, href, icon]) => (
            <Link key={href} href={href} className={`nav-link ${isActive(pathname, href) ? 'nav-link-active' : ''}`} aria-current={isActive(pathname, href) ? 'page' : undefined}>
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-5 text-xs">
          <p className="font-semibold">ATLYN Workspace</p>
          <p className="mt-1 text-slate-500">Propulsé par FORGE AI</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2" aria-label="Accueil FORGE AI">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-black text-[#192011]">F</span>
            <span className="text-sm font-semibold tracking-[.08em]">FORGE <b className="text-brand">AI</b></span>
          </Link>
          <Link href="/missions" className="btn-primary !px-3 !py-2" aria-label="Créer une nouvelle mission"><Icon name="plus" size={16} /> Mission</Link>
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-28 sm:p-6 md:p-8 md:pb-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5 md:mb-8 md:pb-6">
            <div>
              <p className="eyebrow">Espace ATLYN</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{title}</h1>
            </div>
            {pathname !== '/missions' && <Link href="/missions" className="btn-primary hidden md:inline-flex"><Icon name="plus" /> Nouvelle mission</Link>}
          </header>
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-[#141519]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden" aria-label="Navigation mobile">
          {mobileLinks.map(([label, href, icon]) => (
            <Link key={href} href={href} className={`mobile-nav-link ${isActive(pathname, href) ? 'mobile-nav-link-active' : ''}`} aria-current={isActive(pathname, href) ? 'page' : undefined}>
              <Icon name={icon} size={20} />
              <span>{label === 'Tableau de bord' ? 'Accueil' : label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

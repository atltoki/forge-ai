import Link from 'next/link';
import { Icon } from './icons';

const links = [
  ['Dashboard', '/', 'grid'],
  ['Agents', '/agents', 'bot'],
  ['Missions', '/missions', 'target'],
  ['Memory', '/memory', 'brain'],
  ['Tools', '/tools', 'wrench'],
  ['Logs', '/logs', 'logs'],
  ['Analytics', '/analytics', 'chart'],
  ['Auth', '/auth', 'shield'],
  ['Settings', '/settings', 'gear'],
];

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-[#141519] p-5 md:flex md:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[#192011] font-black">F</span>
          <span className="font-semibold tracking-[.08em]">FORGE <b className="text-brand">AI</b></span>
        </Link>
        <nav className="space-y-1">
          {links.map(([label, href, icon]) => (
            <Link key={href} href={href} className={'nav-link ' + (title === label ? 'nav-link-active' : '')}>
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-5 text-xs">
          <p className="font-semibold">KERN Studio</p>
          <p className="mt-1 text-slate-500">Plan Pro</p>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="eyebrow">Workspace / {title}</p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-muted p-2.5" aria-label="Notifications"><Icon name="bell" /></button>
            <Link href="/missions" className="btn-primary"><Icon name="plus" />New mission</Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

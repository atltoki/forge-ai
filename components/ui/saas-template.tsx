'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Database, Menu, Orbit, Search, Sparkles, X } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'gradient';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ff5c] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50';
    const variants = {
      default: 'bg-white text-black hover:bg-gray-100',
      secondary: 'border border-white/10 bg-white/[.06] text-white hover:bg-white/10',
      ghost: 'text-white/65 hover:bg-white/[.06] hover:text-white',
      gradient: 'bg-gradient-to-b from-[#d5ffa2] via-[#b8ff5c] to-[#8bdc3d] text-[#17200d] shadow-[0_14px_45px_rgba(184,255,92,.18)] hover:-translate-y-0.5 active:translate-y-0',
    };
    const sizes = { default: 'h-10 px-4 py-2 text-sm', sm: 'h-10 px-5 text-sm', lg: 'h-12 px-7 text-sm md:text-base' };

    return <button ref={ref} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
  },
);
Button.displayName = 'Button';

const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = (href: string) => { window.location.href = href; };

  return <header className="fixed top-0 z-50 w-full border-b border-white/[.07] bg-black/75 backdrop-blur-xl">
    <nav className="mx-auto max-w-7xl px-5 py-4 md:px-8" aria-label="Navigation publique">
      <div className="flex items-center justify-between">
        <Link href="/welcome" className="flex items-center gap-3" aria-label="Accueil FORGE AI"><span className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#b8ff5c] font-black text-[#17200d]"><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-black bg-violet-400" />F</span><span className="font-semibold tracking-[.08em] text-white">FORGE <b className="text-[#b8ff5c]">AI</b></span></Link>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-8 md:flex">
          <a href="#getting-started" className="text-sm text-white/50 transition-colors hover:text-white">Découvrir</a>
          <a href="#agents" className="text-sm text-white/50 transition-colors hover:text-white">Agents</a>
          <a href="#results" className="text-sm text-white/50 transition-colors hover:text-white">Résultats</a>
        </div>

        <div className="hidden items-center gap-2 md:flex"><Button type="button" variant="ghost" size="sm" onClick={() => navigate('/auth')}>Connexion</Button><Button type="button" variant="default" size="sm" onClick={() => navigate('/auth?next=/')}>Ouvrir FORGE</Button></div>
        <button type="button" className="rounded-lg p-2 text-white md:hidden" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Ouvrir le menu" aria-expanded={mobileMenuOpen} aria-controls="public-mobile-menu">{mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </nav>

    {mobileMenuOpen && <div id="public-mobile-menu" className="border-t border-white/[.07] bg-black/95 px-5 py-5 backdrop-blur-xl md:hidden"><div className="flex flex-col gap-1">{[['Découvrir', '#getting-started'], ['Agents', '#agents'], ['Résultats', '#results']].map(([label, href]) => <a key={href} href={href} className="rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/[.05] hover:text-white" onClick={() => setMobileMenuOpen(false)}>{label}</a>)}<div className="mt-3 grid gap-2 border-t border-white/[.07] pt-4"><Button type="button" variant="ghost" onClick={() => navigate('/auth')}>Connexion</Button><Button type="button" variant="default" onClick={() => navigate('/auth?next=/')}>Ouvrir FORGE</Button></div></div></div>}
  </header>;
});
Navigation.displayName = 'Navigation';

const Hero = React.memo(() => {
  const navigate = (href: string) => { window.location.href = href; };
  return <>
    <section id="getting-started" className="relative flex min-h-screen flex-col items-center overflow-hidden px-5 pb-20 pt-32 md:px-8 md:pt-40">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '42px 42px', maskImage: 'radial-gradient(circle at 50% 28%, black, transparent 70%)' }} />
      <div className="pointer-events-none absolute left-1/2 top-12 h-[34rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(184,255,92,.13),rgba(139,92,246,.055)_38%,transparent_68%)]" aria-hidden="true" />

      <aside className="relative mb-8 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-4 py-2 backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-[#b8ff5c] shadow-[0_0_12px_rgba(184,255,92,.8)]" /><span className="whitespace-nowrap text-center text-xs text-white/55">FORGE Constellation est opérationnel</span><a href="#agents" className="flex items-center gap-1 whitespace-nowrap text-xs text-[#b8ff5c] transition hover:text-white">Découvrir <ArrowRight size={12} /></a></aside>

      <h1 className="relative max-w-4xl bg-gradient-to-b from-white via-white to-white/45 bg-clip-text px-2 text-center text-4xl font-medium leading-[1.05] tracking-[-.055em] text-transparent md:text-6xl lg:text-7xl">Transformez une intention<br />en mission accomplie.</h1>
      <p className="relative mt-7 max-w-2xl text-center text-sm leading-7 text-white/45 md:text-base">Un workspace d’agents IA qui recherche, vérifie et structure vos informations. Orion orchestre. Atlas explore. Vous gardez le contrôle.</p>
      <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3"><Button type="button" variant="gradient" size="lg" onClick={() => navigate('/auth?next=/')}><Sparkles size={17} />Lancer une mission</Button><Button type="button" variant="secondary" size="lg" onClick={() => navigate('/auth')}>Se connecter <ArrowRight size={16} /></Button></div>

      <div className="relative mt-20 w-full max-w-6xl pb-10">
        <div className="pointer-events-none absolute left-1/2 top-[-18%] h-80 w-[90%] -translate-x-1/2 overflow-hidden rounded-full opacity-30 blur-3xl" aria-hidden="true"><img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=70" alt="" className="h-full w-full object-cover" /></div>
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111216] p-2 shadow-[0_35px_120px_rgba(0,0,0,.65)] md:p-3">
          <div className="flex items-center gap-2 border-b border-white/[.07] px-3 py-3"><span className="h-2.5 w-2.5 rounded-full bg-red-400/70"/><span className="h-2.5 w-2.5 rounded-full bg-amber-300/70"/><span className="h-2.5 w-2.5 rounded-full bg-[#b8ff5c]/70"/><span className="ml-3 font-mono text-[9px] uppercase tracking-[.14em] text-white/25">forge-ai / pilotage</span></div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#15161b]"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1800&q=82" alt="Aperçu d’un tableau de bord analytique" className="h-full w-full object-cover opacity-25 saturate-0" loading="eager" /><div className="absolute inset-0 bg-gradient-to-br from-[#101114]/20 via-[#101114]/65 to-[#101114]"/><div className="absolute inset-0 grid gap-3 p-4 sm:grid-cols-3 md:gap-5 md:p-8"><div className="rounded-2xl border border-[#b8ff5c]/20 bg-black/55 p-4 backdrop-blur md:col-span-2"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#b8ff5c]">Mission active</p><h2 className="mt-3 text-lg font-medium text-white md:text-2xl">Prospection internationale</h2><p className="mt-2 max-w-lg text-xs leading-5 text-white/40">Atlas vérifie les entreprises, leurs sites et les sources publiques.</p><div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-3/4 rounded-full bg-[#b8ff5c]"/></div></div><div className="rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-violet-300">Réseau</p><div className="mt-5 grid place-items-center"><Orbit className="text-[#b8ff5c]" size={62}/><p className="mt-4 text-sm text-white">Orion + Atlas</p><p className="mt-1 text-xs text-white/35">2 agents connectés</p></div></div><div className="hidden rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur sm:block"><p className="text-xs text-white/35">Sources vérifiées</p><p className="mt-3 text-3xl text-white">24</p></div><div className="hidden rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur sm:block"><p className="text-xs text-white/35">Progression</p><p className="mt-3 text-3xl text-white">76%</p></div><div className="hidden rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur sm:block"><p className="text-xs text-white/35">Mémoire</p><p className="mt-3 text-3xl text-white">8</p></div></div></div>
        </div>
      </div>
    </section>

    <section id="agents" className="mx-auto max-w-7xl px-5 py-24 md:px-8"><div className="mx-auto max-w-2xl text-center"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#b8ff5c]">Agent network</p><h2 className="mt-4 text-3xl font-medium tracking-[-.04em] text-white md:text-5xl">Une équipe qui ne dort jamais.</h2><p className="mt-5 text-sm leading-7 text-white/40">Chaque composant du réseau possède un rôle précis et laisse une trace vérifiable.</p></div><div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[
      { icon: Orbit, title: 'Orion', copy: 'Planifie et orchestre chaque mission.' },
      { icon: Bot, title: 'Atlas', copy: 'Recherche les prospects et les sources.' },
      { icon: Search, title: 'Tavily + Gemini', copy: 'Explore et synthétise le web public.' },
      { icon: Database, title: 'Mémoire', copy: 'Conserve les résultats exploitables.' },
    ].map(({ icon: FeatureIcon, title, copy }) => <article key={title} className="rounded-3xl border border-white/[.075] bg-white/[.025] p-6 transition hover:-translate-y-1 hover:border-[#b8ff5c]/20"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#b8ff5c]/20 bg-[#b8ff5c]/[.07] text-[#b8ff5c]"><FeatureIcon size={19}/></span><h3 className="mt-6 font-medium text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/35">{copy}</p></article>)}</div></section>

    <section id="results" className="border-t border-white/[.06] px-5 py-24 md:px-8"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#b8ff5c]">Résultats concrets</p><h2 className="mt-4 max-w-xl text-3xl font-medium tracking-[-.04em] text-white md:text-5xl">De la commande à la donnée exploitable.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-white/40">Les missions terminées deviennent des listes sourcées, consultables et mémorisées dans votre workspace.</p><Button type="button" variant="gradient" size="lg" className="mt-8" onClick={() => navigate('/auth?next=/missions')}>Créer ma première mission <ArrowRight size={16}/></Button></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl border border-[#b8ff5c]/15 bg-[#b8ff5c]/[.045] p-6 sm:row-span-2"><p className="text-xs text-white/40">Pipeline</p><p className="mt-14 text-5xl font-medium text-white">100%</p><p className="mt-3 text-sm text-[#b8ff5c]">Mission suivie en temps réel</p></div><div className="rounded-3xl border border-white/[.07] bg-white/[.025] p-6"><p className="text-xs text-white/40">Sources</p><p className="mt-8 text-3xl text-white">Publiques</p></div><div className="rounded-3xl border border-violet-400/15 bg-violet-400/[.045] p-6"><p className="text-xs text-white/40">Mémoire</p><p className="mt-8 text-3xl text-white">Persistante</p></div></div></div></section>
  </>;
});
Hero.displayName = 'Hero';

export default function SaasTemplate() {
  return <main className="min-h-screen overflow-x-hidden bg-black text-white"><Navigation/><Hero/><footer className="border-t border-white/[.06] px-5 py-8 text-center text-xs text-white/25">FORGE AI · ATLYN Workspace</footer></main>;
}

import Link from 'next/link';
import { Icon } from './icons';
import { Progress, StatusBadge } from './ui';

type AgentNode = { id: string; name: string; role: string; status: string };
type ToolNode = { id: string; name: string; status: string };

export function SignalMetric({ label, value, detail, icon, tone = 'brand', featured = false }: { label: string; value: string; detail: string; icon: string; tone?: 'brand' | 'violet' | 'blue' | 'amber'; featured?: boolean }) {
  const tones = { brand: 'text-brand bg-brand/10 border-brand/20', violet: 'text-violet-300 bg-violet-400/10 border-violet-400/20', blue: 'text-sky-300 bg-sky-400/10 border-sky-400/20', amber: 'text-amber-300 bg-amber-400/10 border-amber-400/20' };
  return <article className={`metric-tile ${featured ? 'sm:col-span-2 xl:col-span-1' : ''}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl border ${tones[tone]}`}><Icon name={icon} /></span></div><p className="mt-5 text-xs text-slate-500">{detail}</p></article>;
}

export function AgentConstellation({ agents, tools }: { agents: AgentNode[]; tools: ToolNode[] }) {
  const positions = [{ left: '13%', top: '24%' }, { left: '72%', top: '21%' }, { left: '72%', top: '67%' }, { left: '13%', top: '68%' }];
  return <section className="constellation-panel relative min-h-[390px] overflow-hidden" aria-labelledby="agent-network-title">
    <div className="absolute inset-0 constellation-grid opacity-60" />
    <div className="relative z-10 flex items-start justify-between gap-4"><div><p className="eyebrow">Agent network</p><h2 id="agent-network-title" className="mt-1 text-lg font-semibold">Constellation active</h2></div><Link href="/agents" className="text-xs text-brand">Gérer le réseau</Link></div>
    <div className="pointer-events-none absolute inset-x-8 bottom-10 top-20" aria-hidden="true">
      <svg className="h-full w-full" viewBox="0 0 500 280" preserveAspectRatio="none"><defs><linearGradient id="signal" x1="0" x2="1"><stop stopColor="#b8ff5c" stopOpacity=".1"/><stop offset=".5" stopColor="#b8ff5c" stopOpacity=".7"/><stop offset="1" stopColor="#a78bfa" stopOpacity=".15"/></linearGradient></defs>{agents.slice(0, 4).map((agent, index) => { const points = [[75,70],[420,65],[420,210],[75,215]][index]; return <line key={agent.id} x1="250" y1="140" x2={points[0]} y2={points[1]} stroke="url(#signal)" strokeWidth="1" strokeDasharray="5 7" />; })}<circle cx="250" cy="140" r="62" fill="none" stroke="#b8ff5c" strokeOpacity=".12"/><circle cx="250" cy="140" r="96" fill="none" stroke="#a78bfa" strokeOpacity=".07"/></svg>
    </div>
    <div className="absolute left-1/2 top-[54%] z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-brand/25 bg-[#151a16] shadow-[0_0_55px_rgba(184,255,92,.13)]"><span className="absolute inset-2 animate-pulse rounded-full border border-brand/10"/><div className="text-center"><span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-brand text-[#17200e]"><Icon name="spark" /></span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[.16em] text-brand">FORGE</span></div></div>
    {agents.slice(0, 4).map((agent, index) => <div key={agent.id} className="absolute z-20 w-28 -translate-x-1/2 -translate-y-1/2 text-center" style={positions[index]}><span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl border bg-[#1a1b20] font-semibold shadow-xl ${agent.status === 'active' ? 'border-brand/30 text-brand' : 'border-white/10 text-slate-400'}`}>{agent.name[0]}</span><p className="mt-2 truncate text-xs font-medium text-slate-200">{agent.name}</p><p className="truncate text-[10px] text-slate-600">{agent.role}</p></div>)}
    <div className="absolute inset-x-5 bottom-4 z-20 flex flex-wrap justify-center gap-2">{tools.slice(0, 4).map((tool) => <span key={tool.id} className="inline-flex items-center gap-2 rounded-full border border-white/[.07] bg-black/20 px-3 py-1.5 text-[10px] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${tool.status === 'enabled' ? 'bg-brand' : 'bg-slate-600'}`} />{tool.name}</span>)}</div>
  </section>;
}

export function MissionSpotlight({ mission }: { mission?: { title: string; objective: string; status: string; progress: number } }) {
  return <section className="constellation-panel mission-spotlight overflow-hidden" aria-labelledby="mission-spotlight-title">
    <div className="relative z-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Priorité orbitale</p><h2 id="mission-spotlight-title" className="mt-2 max-w-2xl text-xl font-semibold md:text-2xl">{mission?.title ?? 'Lancer la prochaine prospection'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{mission?.objective ?? 'Définis une cible, Atlas collecte les sources et FORGE structure le résultat.'}</p></div>{mission ? <StatusBadge value={mission.status} /> : <span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs text-brand">Prêt</span>}</div>
      <div className="mt-7">{mission ? <><div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[.13em] text-slate-500"><span>Signal de progression</span><span>{mission.progress}%</span></div><Progress value={mission.progress} /></> : <div className="h-px bg-gradient-to-r from-brand/60 via-violet-400/30 to-transparent" />}</div>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/missions" className="btn-primary"><Icon name={mission ? 'chevron' : 'plus'} />{mission ? 'Ouvrir la mission' : 'Créer une mission'}</Link><Link href="/cockpit" className="btn-muted">Voir le cockpit</Link></div>
    </div>
  </section>;
}

export function ActivityTimeline({ logs }: { logs: { id: string; level: string; source: string; message: string; created_at: string }[] }) {
  return <section className="constellation-panel"><div className="flex items-center justify-between"><div><p className="eyebrow">Flux en direct</p><h2 className="mt-1 text-lg font-semibold">Timeline réseau</h2></div><span className="live-signal"><span/>Live</span></div><ol className="mt-6 space-y-0">{logs.map((log, index) => <li key={log.id} className="relative grid grid-cols-[18px_1fr] gap-3 pb-5 last:pb-0"><div className="relative flex justify-center"><span className={`relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#17181d] ${log.level === 'error' ? 'bg-red-400' : log.level === 'warning' ? 'bg-amber-300' : 'bg-brand'}`} />{index < logs.length - 1 && <span className="absolute bottom-0 top-3 w-px bg-white/[.08]" />}</div><div><p className="text-sm leading-5 text-slate-300">{log.message}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.08em] text-slate-600">{log.source} · {new Date(log.created_at).toLocaleString('fr-FR')}</p></div></li>)}{!logs.length && <li className="text-sm text-slate-500">Aucun événement récent.</li>}</ol></section>;
}

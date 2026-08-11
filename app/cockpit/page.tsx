import Link from 'next/link';
import { Shell } from '@/components/shell';
import { QuickMission } from '@/components/quick-mission';
import { Metric, StatusBadge } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

function currentToolProvider(name: string, provider: string) {
  return name.toLowerCase().includes('web search') ? 'Tavily Search + Gemini' : provider;
}

function currentAgentModel(name: string, model: string) {
  return name.toLowerCase() === 'atlas' ? 'Gemini 3.1 Flash Lite + Tavily Search' : model;
}

export default async function CockpitPage() {
  const { supabase, user } = await requireUserSession();
  const [agentsResult, toolsResult, executionsResult, logsResult] = await Promise.all([
    supabase.from('agents').select('id,name,role,model,status,objectives').eq('user_id', user.id).order('created_at'),
    supabase.from('tools').select('id,name,provider,status').eq('user_id', user.id).order('created_at'),
    supabase.from('executions').select('id,status,created_at,missions(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('logs').select('id,level,source,message,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
  ]);
  const agents = agentsResult.data ?? [];
  const tools = toolsResult.data ?? [];
  const executions = executionsResult.data ?? [];

  return <Shell title="Cockpit JARVIS">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Agents" value={String(agents.length)} detail={`${agents.filter((agent) => agent.status === 'active').length} actifs`} />
      <Metric label="Outils" value={`${tools.filter((tool) => tool.status === 'enabled').length}/${tools.length}`} detail="Connecteurs disponibles" />
      <Metric label="Exécutions actives" value={String(executions.filter((execution) => ['queued', 'running'].includes(execution.status)).length)} detail="File Cloudflare" />
      <Metric label="Dernières réussites" value={String(executions.filter((execution) => execution.status === 'completed').length)} detail={`${executions.length} exécutions observées`} />
    </section>

    <section className="mt-6 grid gap-6 xl:grid-cols-5"><div className="xl:col-span-3"><QuickMission /></div><div className="card xl:col-span-2"><div className="flex items-center justify-between"><div><p className="eyebrow">Système</p><h2 className="mt-1 font-semibold">Connecteurs</h2></div><Link href="/tools" className="text-sm text-brand">Configurer</Link></div><div className="mt-5 space-y-3">{tools.map((tool) => <div key={tool.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"><div><p className="text-sm font-medium">{tool.name}</p><p className="mt-1 text-xs text-slate-500">{currentToolProvider(tool.name, tool.provider)}</p></div><StatusBadge value={tool.status} /></div>)}</div></div></section>

    <section className="mt-6"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Réseau actif</p><h2 className="mt-1 text-lg font-semibold">Agents du workspace</h2></div><Link href="/agents" className="text-sm text-brand">Détails</Link></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{agents.map((agent) => <article key={agent.id} className="card"><div className="flex items-center justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 font-bold text-brand">{agent.name[0]}</span><StatusBadge value={agent.status} /></div><h3 className="mt-4 font-semibold">{agent.name}</h3><p className="mt-1 text-sm text-slate-400">{agent.role}</p><p className="mt-2 text-xs text-slate-600">{currentAgentModel(agent.name, agent.model)}</p><div className="mt-4 space-y-2">{(agent.objectives ?? []).slice(0, 3).map((objective: string) => <p key={objective} className="text-xs text-slate-400">• {objective}</p>)}</div></article>)}</div></section>

    <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card"><p className="eyebrow">Exécutions</p><h2 className="mt-1 font-semibold">Activité récente</h2><div className="mt-4 space-y-3">{executions.map((execution) => { const mission = Array.isArray(execution.missions) ? execution.missions[0] : execution.missions as { title?: string } | null; return <div key={execution.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"><div><p className="text-sm font-medium">{mission?.title ?? 'Mission'}</p><p className="mt-1 text-xs text-slate-500">{new Date(execution.created_at).toLocaleString('fr-FR')}</p></div><StatusBadge value={execution.status} /></div>; })}{!executions.length && <p className="text-sm text-slate-400">Aucune exécution.</p>}</div></div><div className="card"><p className="eyebrow">Console</p><h2 className="mt-1 font-semibold">Journal réseau</h2><div className="mt-4 space-y-3">{(logsResult.data ?? []).map((log) => <div key={log.id} className="flex gap-3 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${log.level === 'error' ? 'bg-red-400' : log.level === 'warning' ? 'bg-amber-300' : 'bg-brand'}`} /><div><p className="text-slate-300">{log.message}</p><p className="mt-1 text-xs text-slate-600">{log.source} · {new Date(log.created_at).toLocaleString('fr-FR')}</p></div></div>)}{!logsResult.data?.length && <p className="text-sm text-slate-400">Aucun événement.</p>}</div></div></section>
  </Shell>;
}

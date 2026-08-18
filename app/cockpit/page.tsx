import Link from 'next/link';
import { Shell } from '@/components/shell';
import { QuickMission } from '@/components/quick-mission';
import { ActivityTimeline, AgentConstellation, SignalMetric } from '@/components/constellation';
import { StatusBadge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { requireUserSession } from '@/lib/supabase/session';
import { ProfitCommandCenter } from '@/components/profit-command-center';

export const dynamic = 'force-dynamic';

function currentToolProvider(name: string, provider: string) {
  return name.toLowerCase().includes('web search') ? 'Tavily Search + Gemini' : provider;
}

function currentAgentModel(name: string, model: string) {
  return name.toLowerCase() === 'atlas' ? 'Gemini 3.1 Flash Lite + Tavily Search' : model;
}

export default async function CockpitPage() {
  const { supabase, user } = await requireUserSession();
  const [agentsResult, toolsResult, executionsResult, logsResult, prospectsResult] = await Promise.all([
    supabase.from('agents').select('id,name,role,model,status,objectives').eq('user_id', user.id).order('created_at'),
    supabase.from('tools').select('id,name,provider,status').eq('user_id', user.id).order('created_at'),
    supabase.from('executions').select('id,status,created_at,missions(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('logs').select('id,level,source,message,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('prospects').select('id,company_name,status,score,follow_up_at', { count: 'exact' }).eq('user_id', user.id).order('score', { ascending: false }),
  ]);
  const agents = agentsResult.data ?? [];
  const tools = toolsResult.data ?? [];
  const executions = executionsResult.data ?? [];
  const logs = logsResult.data ?? [];
  const activeExecutions = executions.filter((execution) => ['queued', 'running'].includes(execution.status));
  const prospects = prospectsResult.data ?? [];
  const followUps = prospects.filter((prospect) => prospect.follow_up_at && new Date(prospect.follow_up_at).getTime() <= Date.now()).length;
  const statusProbability: Record<string, number> = { new: .1, qualified: .25, contacted: .4, interested: .65, won: 1, archived: 0 };
  const pipelineValue = Math.round(prospects.reduce((sum, prospect) => sum + (Math.max(prospect.score ?? 0, 20) * 45 * (statusProbability[prospect.status] ?? .1)), 0));
  const topProspects = prospects.filter((prospect) => prospect.status !== 'archived' && prospect.status !== 'won').slice(0, 3);
  const opportunities = [
    ...topProspects.map((prospect, index) => ({ id: `prospect-${prospect.id}`, title: `Faire avancer ${prospect.company_name}`, detail: prospect.follow_up_at && new Date(prospect.follow_up_at).getTime() <= Date.now() ? 'Relance arrivée à échéance : prépare un message personnalisé à valider.' : 'Prospect prioritaire détecté dans le pipeline commercial.', type: 'revenu' as const, value: Math.round((prospect.score || 20) * 45 * (statusProbability[prospect.status] ?? .1)), minutes: 25, score: Math.min(98, 60 + (prospect.score || 0) / 3 - index * 4), action: 'Préparer', objective: `Analyse le prospect ${prospect.company_name}, recherche les signaux utiles disponibles, puis prépare une relance commerciale personnalisée. Ne rien envoyer sans validation humaine.`, requiresApproval: true })),
    { id: 'gmail-triage', title: 'Trier la boîte de réception', detail: 'Identifier les prospects chauds, demandes urgentes, factures et messages sans réponse.', type: 'temps' as const, value: 0, minutes: 45, score: 84, action: 'Analyser', objective: 'Analyse les priorités de la boîte Gmail connectée. Classe les messages par urgence et valeur commerciale, puis prépare une synthèse actionnable. Ne réponds à aucun message sans validation humaine.', requiresApproval: false },
    { id: 'meeting-briefs', title: 'Préparer les prochains rendez-vous', detail: 'Transformer le calendrier en briefs courts avec contexte, enjeux et prochaine meilleure action.', type: 'temps' as const, value: 0, minutes: 35, score: 78, action: 'Préparer', objective: 'Analyse les prochains rendez-vous Google Calendar et prépare pour chacun un brief avec contexte, objectifs, points de vigilance et questions à poser.', requiresApproval: false },
    { id: 'drive-memory', title: 'Consolider la mémoire métier', detail: 'Repérer dans Drive les offres, tarifs, procédures et documents clients à mémoriser.', type: 'risque' as const, value: 0, minutes: 60, score: 73, action: 'Scanner', objective: 'Analyse les documents professionnels pertinents dans Google Drive et propose les connaissances durables à ajouter à la mémoire métier. Ne modifie ni ne supprime aucun fichier.', requiresApproval: false },
  ].sort((a, b) => b.score - a.score);

  return <Shell title="Cockpit JARVIS">
    <ProfitCommandCenter opportunities={opportunities} pipelineValue={pipelineValue} hoursSaved={Math.round(opportunities.reduce((sum, item) => sum + item.minutes, 0) / 60 * 10) / 10} approvalCount={opportunities.filter((item) => item.requiresApproval).length} />
    <div className="mt-5" />
    <div className="grid gap-5 xl:grid-cols-12"><div className="xl:col-span-7"><QuickMission /></div><div className="xl:col-span-5"><AgentConstellation agents={agents} tools={tools} /></div></div>

    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="État du cockpit">
      <SignalMetric label="Agents actifs" value={`${agents.filter((agent) => agent.status === 'active').length}/${agents.length}`} detail="Réseau disponible" icon="bot" />
      <SignalMetric label="Connecteurs" value={`${tools.filter((tool) => tool.status === 'enabled').length}/${tools.length}`} detail="Services opérationnels" icon="wrench" tone="violet" />
      <SignalMetric label="En orbite" value={String(activeExecutions.length)} detail="Exécutions Cloudflare" icon="spark" tone="blue" />
      <SignalMetric label="Réussites" value={String(executions.filter((execution) => execution.status === 'completed').length)} detail={`${executions.length} exécutions observées`} icon="check" tone="amber" />
      <SignalMetric label="Pipeline" value={String(prospectsResult.count ?? prospects.length)} detail={`${followUps} relance${followUps > 1 ? 's' : ''} à traiter`} icon="users" tone="brand" />
    </section>

    <div className="mt-5 grid gap-5 xl:grid-cols-12">
      <section className="constellation-panel xl:col-span-7" aria-labelledby="executions-title"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Execution stream</p><h2 id="executions-title" className="mt-1 text-lg font-semibold">Activité des missions</h2></div><Link href="/missions" className="inline-flex items-center gap-2 text-xs text-brand">Missions <Icon name="arrow" size={14}/></Link></div><div className="mt-5 overflow-hidden rounded-2xl border border-white/[.06]"><div className="hidden grid-cols-[1fr_9rem_8rem] border-b border-white/[.06] bg-white/[.02] px-4 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-slate-700 md:grid"><span>Mission</span><span>Création</span><span>État</span></div>{executions.map((execution) => { const mission = Array.isArray(execution.missions) ? execution.missions[0] : execution.missions as { title?: string } | null; return <div key={execution.id} className="grid gap-3 border-b border-white/[.055] px-4 py-4 last:border-0 md:grid-cols-[1fr_9rem_8rem] md:items-center"><div className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.035] text-slate-500"><Icon name="target" size={15}/></span><p className="truncate text-sm font-medium text-slate-300">{mission?.title ?? 'Mission'}</p></div><time className="font-mono text-[10px] text-slate-600">{new Date(execution.created_at).toLocaleString('fr-FR')}</time><div><StatusBadge value={execution.status}/></div></div>; })}{!executions.length && <p className="p-8 text-center text-sm text-slate-500">Aucune exécution.</p>}</div></section>

      <section className="constellation-panel xl:col-span-5" aria-labelledby="connectors-title"><div className="flex items-end justify-between"><div><p className="eyebrow">Systems mesh</p><h2 id="connectors-title" className="mt-1 text-lg font-semibold">Connecteurs</h2></div><Link href="/tools" className="text-xs text-brand">Configurer</Link></div><div className="mt-5 grid gap-3">{tools.map((tool, index) => <article key={tool.id} className="group flex items-center gap-4 rounded-2xl border border-white/[.06] bg-black/15 p-3.5 transition hover:border-white/[.11]"><span className={`grid h-10 w-10 place-items-center rounded-xl border ${index % 3 === 0 ? 'border-brand/20 bg-brand/[.07] text-brand' : index % 3 === 1 ? 'border-violet-400/20 bg-violet-400/[.07] text-violet-300' : 'border-sky-400/20 bg-sky-400/[.07] text-sky-300'}`}><Icon name={index % 3 === 0 ? 'wrench' : index % 3 === 1 ? 'brain' : 'search'} size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-300">{tool.name}</p><p className="mt-1 truncate text-xs text-slate-600">{currentToolProvider(tool.name, tool.provider)}</p></div><StatusBadge value={tool.status}/></article>)}</div></section>
    </div>

    <section className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3" aria-labelledby="agents-title">{agents.map((agent, index) => <article key={agent.id} className="constellation-panel group overflow-hidden"><div className={`absolute inset-x-0 top-0 h-px ${index % 2 ? 'bg-gradient-to-r from-transparent via-violet-400/60 to-transparent' : 'bg-gradient-to-r from-transparent via-brand/60 to-transparent'}`} /><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl border text-lg font-semibold ${index % 2 ? 'border-violet-400/20 bg-violet-400/[.07] text-violet-300' : 'border-brand/20 bg-brand/[.07] text-brand'}`}>{agent.name[0]}</span><StatusBadge value={agent.status}/></div><h2 id={index === 0 ? 'agents-title' : undefined} className="mt-5 text-lg font-semibold">{agent.name}</h2><p className="mt-1 text-sm text-slate-400">{agent.role}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[.1em] text-slate-700">{currentAgentModel(agent.name, agent.model)}</p><div className="mt-5 space-y-2 border-t border-white/[.06] pt-4">{(agent.objectives ?? []).slice(0, 3).map((objective: string) => <p key={objective} className="flex gap-2 text-xs leading-5 text-slate-500"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand"/>{objective}</p>)}</div></article>)}</section>

    <div className="mt-5"><ActivityTimeline logs={logs}/></div>
  </Shell>;
}

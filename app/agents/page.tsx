import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const { supabase, user } = await requireUserSession();
  const { data: agents } = await supabase.from('agents').select('*').eq('user_id', user.id).order('created_at');

  return (
    <Shell title="Agents">
      <p className="mb-6 max-w-2xl text-slate-400">Les agents réellement disponibles pour planifier et exécuter les missions ATLYN.</p>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {(agents ?? []).map((agent) => (
          <article key={agent.id} className="card">
            <div className="flex justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-lg font-bold text-brand">{agent.name[0]}</span><StatusBadge value={agent.status} /></div>
            <h2 className="mt-5 text-lg font-semibold">{agent.name}</h2>
            <p className="text-sm text-slate-400">{agent.role}</p>
            <p className="mt-3 text-xs text-slate-500">{agent.model}</p>
            <div className="mt-5 space-y-2">{(agent.objectives ?? []).map((objective: string) => <p key={objective} className="rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{objective}</p>)}</div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

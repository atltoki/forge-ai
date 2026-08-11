import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function ToolsPage() {
  const { supabase, user } = await requireUserSession();
  const { data: tools } = await supabase.from('tools').select('*').eq('user_id', user.id).order('created_at');

  return (
    <Shell title="Tools">
      <p className="mb-6 max-w-2xl text-slate-400">Services réellement autorisés pour les agents et leurs permissions.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {(tools ?? []).map((tool) => (
          <article key={tool.id} className="card">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{tool.provider}</p><h2 className="mt-1 text-lg font-semibold">{tool.name}</h2></div><StatusBadge value={tool.status} /></div>
            <p className="mt-4 text-sm text-slate-400">{tool.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">{(tool.permissions ?? []).map((permission: string) => <span key={permission} className="rounded-full border border-line px-2.5 py-1 text-xs text-slate-400">{permission}</span>)}</div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

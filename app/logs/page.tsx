import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
  const { supabase, user } = await requireUserSession();
  const { data: logs } = await supabase.from('logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);

  return (
    <Shell title="Logs">
      <div className="card overflow-hidden p-0">
        <div className="border-b border-line px-5 py-4"><p className="eyebrow">Journal système réel</p></div>
        {(logs ?? []).length ? <div className="divide-y divide-line">{(logs ?? []).map((log) => (
          <div key={log.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[120px_180px_1fr_auto]">
            <StatusBadge value={log.level} /><span className="text-slate-400">{log.source}</span><span>{log.message}</span><span className="text-slate-500">{new Date(log.created_at).toLocaleString('fr-FR')}</span>
          </div>
        ))}</div> : <p className="p-8 text-sm text-slate-400">Aucun événement pour le moment.</p>}
      </div>
    </Shell>
  );
}

import { Shell } from '@/components/shell';
import { requireUserSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

export default async function MemoryPage() {
  const { supabase, user } = await requireUserSession();
  const { data: items } = await supabase.from('memory').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });

  return (
    <Shell title="Memory">
      <p className="mb-6 max-w-2xl text-slate-400">Les résultats terminés sont mémorisés automatiquement et reliés à leur mission.</p>
      <div className="card overflow-hidden p-0">
        {(items ?? []).length ? (items ?? []).map((item) => (
          <div key={item.id} className="grid gap-3 border-b border-line px-5 py-4 text-sm md:grid-cols-[1fr_auto_auto]">
            <span><b className="font-medium">{item.title}</b><span className="mt-1 block whitespace-pre-wrap text-slate-500">{item.content}</span></span>
            <span className="text-violet-300">{item.collection}</span>
            <span className="text-slate-500">{new Date(item.updated_at).toLocaleString('fr-FR')}</span>
          </div>
        )) : <p className="p-8 text-sm text-slate-400">La mémoire se remplira après la première mission terminée.</p>}
      </div>
    </Shell>
  );
}

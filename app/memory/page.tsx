import { Shell } from '@/components/shell';
import { queryMemory } from '@/lib/engines/memory-engine';

export default function MemoryPage() {
  const items = queryMemory();

  return (
    <Shell title="Memory">
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <p className="max-w-2xl text-slate-400">Memoire partagee et persistante pour les agents, les missions et les decisions produit.</p>
        <button className="btn-primary">Add knowledge</button>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-[1fr_auto_auto] gap-5 border-b border-line px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
          <span>Item</span>
          <span>Collection</span>
          <span>Updated</span>
        </div>
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-5 px-5 py-4 text-sm">
            <span>
              <b className="font-medium">{item.title}</b>
              <span className="mt-1 block text-slate-500">{item.content}</span>
            </span>
            <span className="text-violet-300">{item.collection}</span>
            <span className="text-slate-500">{item.updated}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

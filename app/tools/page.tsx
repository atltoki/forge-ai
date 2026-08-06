import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { listTools } from '@/lib/engines/tool-manager';

export default function ToolsPage() {
  const tools = listTools();

  return (
    <Shell title="Tools">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-slate-400">Registry des plugins. Chaque outil déclare ses permissions avant d’être accessible aux agents.</p>
        <button className="btn-primary">Register tool</button>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {tools.map((tool) => (
          <article key={tool.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{tool.provider}</p>
                <h2 className="mt-1 text-lg font-semibold">{tool.name}</h2>
              </div>
              <StatusBadge value={tool.status} />
            </div>
            <p className="mt-4 text-sm text-slate-400">{tool.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {tool.permissions.map((permission) => (
                <span key={permission} className="rounded-full border border-line px-2.5 py-1 text-xs text-slate-400">{permission}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

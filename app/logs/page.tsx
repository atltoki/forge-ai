import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';
import { logs } from '@/lib/data';

export default function LogsPage() {
  return (
    <Shell title="Logs">
      <div className="card overflow-hidden p-0">
        <div className="border-b border-line px-5 py-4">
          <p className="eyebrow">System journal</p>
        </div>
        <div className="divide-y divide-line">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[120px_180px_1fr_auto]">
              <StatusBadge value={log.level} />
              <span className="text-slate-400">{log.source}</span>
              <span>{log.message}</span>
              <span className="text-slate-500">{log.createdAt}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

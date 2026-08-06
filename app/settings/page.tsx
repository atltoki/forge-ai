import { Shell } from '@/components/shell';
import { StatusBadge } from '@/components/ui';

const settings = [
  ['Supabase', 'Auth, PostgreSQL, RLS, mémoire persistante et journaux.', 'needs_config'],
  ['Cloudflare Workers', 'Execution sécurisée des missions et passerelle d outils.', 'needs_config'],
  ['Cloudflare AI', 'Provider IA prioritaire pour l’exécution edge.', 'needs_config'],
  ['LLM fallback', 'OpenAI, Anthropic, Gemini ou Ollama selon les agents.', 'needs_config'],
  ['Vercel', 'Deploiement web et variables environnement.', 'enabled'],
];

export default function SettingsPage() {
  return (
    <Shell title="Settings">
      <p className="mb-6 max-w-2xl text-slate-400">Configuration opérationnelle du cockpit. Les services peuvent être branchés progressivement sans casser le mode démo.</p>
      <div className="space-y-4">
        {settings.map(([name, copy, status]) => (
          <section key={name} className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">{name}</h2>
              <p className="mt-1 text-sm text-slate-400">{copy}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge value={status} />
              <button className="btn-muted">Configure</button>
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}

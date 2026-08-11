import type { SupabaseClient, User } from '@supabase/supabase-js';

const defaultTools = [
  {
    name: 'Web Search',
    slug: 'web-search',
    provider: 'OpenAI Responses API',
    description: 'Recherche et vérification de sources publiques pour la prospection.',
    status: 'enabled',
    permissions: ['read', 'external_request'],
  },
  {
    name: 'Supabase',
    slug: 'supabase',
    provider: 'Supabase',
    description: 'Persistance des missions, résultats, mémoire et journaux.',
    status: 'enabled',
    permissions: ['read', 'write'],
  },
  {
    name: 'Mission Runner',
    slug: 'mission-runner',
    provider: 'Cloudflare Workers',
    description: 'File d’attente et exécution asynchrone des missions.',
    status: 'enabled',
    permissions: ['execute', 'external_request'],
  },
];

const defaultAgents = [
  {
    name: 'Orion',
    role: 'Manager de missions',
    model: 'FORGE orchestration',
    status: 'active',
    objectives: ['Planifier les missions', 'Suivre les exécutions', 'Contrôler les résultats'],
    memory_collections: ['Mission results', 'Operating rules'],
  },
  {
    name: 'Atlas',
    role: 'Agent de recherche ATLYN',
    model: 'OpenAI Responses API + Web Search',
    status: 'active',
    objectives: ['Identifier des prospects', 'Vérifier les sources', 'Produire des listes exploitables'],
    memory_collections: ['Mission results', 'Prospecting'],
  },
];

export async function bootstrapWorkspace(supabase: SupabaseClient, user: User) {
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? null,
    workspace_name: 'ATLYN / FORGE AI',
    updated_at: new Date().toISOString(),
  });

  await supabase.from('tools').upsert(
    defaultTools.map((tool) => ({ ...tool, user_id: user.id })),
    { onConflict: 'user_id,slug' },
  );

  const { count } = await supabase
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (!count) {
    await supabase.from('agents').insert(defaultAgents.map((agent) => ({ ...agent, user_id: user.id })));
  }
}

import type { Agent, Execution, LogEntry, MemoryItem, Mission, Tool } from './domain/types';

export const tools: Tool[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    slug: 'web-search',
    description: 'Recherche, synthèse et vérification de sources publiques.',
    status: 'needs_config',
    permissions: ['read', 'external_request'],
    provider: 'Cloudflare Worker',
  },
  {
    id: 'github',
    name: 'GitHub',
    slug: 'github',
    description: 'Lecture de dépôts, création d’issues et analyse de pull requests.',
    status: 'needs_config',
    permissions: ['read', 'write', 'external_request'],
    provider: 'GitHub App',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    slug: 'supabase',
    description: 'Persistance des agents, missions, mémoire et journaux.',
    status: 'enabled',
    permissions: ['read', 'write'],
    provider: 'Supabase',
  },
  {
    id: 'email',
    name: 'Email',
    slug: 'email',
    description: 'Préparation et envoi contrôlé de messages opérationnels.',
    status: 'disabled',
    permissions: ['read', 'write', 'external_request'],
    provider: 'SMTP / API',
  },
];

export const agents: Agent[] = [
  {
    id: 'manager',
    name: 'Orion',
    role: 'Manager agent',
    model: 'Cloudflare AI / OpenAI compatible',
    status: 'active',
    color: 'bg-brand text-[#202513]',
    objectives: ['Découper les missions', 'Distribuer le travail', 'Vérifier les résultats'],
    tools: ['supabase', 'github'],
    memoryCollections: ['Operating rules', 'Team context'],
    missionsThisWeek: 18,
  },
  {
    id: 'research',
    name: 'Atlas',
    role: 'Research agent',
    model: 'OpenAI GPT compatible',
    status: 'active',
    color: 'bg-violet-500',
    objectives: ['Explorer le web', 'Qualifier les sources', 'Produire des synthèses'],
    tools: ['web-search', 'supabase'],
    memoryCollections: ['Research', 'Sources'],
    missionsThisWeek: 12,
  },
  {
    id: 'builder',
    name: 'Forge',
    role: 'Build agent',
    model: 'Claude / GPT compatible',
    status: 'idle',
    color: 'bg-cyan-500',
    objectives: ['Proposer des changements', 'Écrire du code', 'Documenter les livraisons'],
    tools: ['github', 'supabase'],
    memoryCollections: ['Architecture', 'Changelog'],
    missionsThisWeek: 6,
  },
];

export const missions: Mission[] = [
  {
    id: 'm1',
    title: 'Agent OS foundation',
    objective: 'Structurer le moteur de missions, outils et mémoire pour la V0.2.',
    agentId: 'manager',
    status: 'running',
    progress: 72,
    updated: '2 min ago',
    steps: [
      { id: 'm1-s1', title: 'Analyser la mission', agentId: 'manager', toolIds: ['supabase'], status: 'completed' },
      { id: 'm1-s2', title: 'Préparer les composants d’exécution', agentId: 'builder', toolIds: ['github'], status: 'running' },
      { id: 'm1-s3', title: 'Persist memory snapshot', agentId: 'manager', toolIds: ['supabase'], status: 'queued' },
    ],
  },
  {
    id: 'm2',
    title: 'Competitive intelligence brief',
    objective: 'Comparer les capacités de Manus, Genspark, n8n et Operator.',
    agentId: 'research',
    status: 'review',
    progress: 100,
    updated: '28 min ago',
    steps: [
      { id: 'm2-s1', title: 'Collecter les sources', agentId: 'research', toolIds: ['web-search'], status: 'completed' },
      { id: 'm2-s2', title: 'Synthèse exécutive', agentId: 'research', toolIds: ['supabase'], status: 'completed' },
    ],
  },
  {
    id: 'm3',
    title: 'Plugin registry',
    objective: 'Définir les permissions et le cycle de vie des outils externes.',
    agentId: 'builder',
    status: 'queued',
    progress: 0,
    updated: '1 h ago',
    steps: [
      { id: 'm3-s1', title: 'Lister les providers prioritaires', agentId: 'manager', toolIds: ['supabase'], status: 'queued' },
    ],
  },
];

export const memory: MemoryItem[] = [
  {
    id: 'mem-1',
    title: 'FORGE AI product doctrine',
    collection: 'Operating rules',
    content: 'FORGE AI est un OS d’agents, pas un chatbot. Chaque fonctionnalité doit être immédiatement utile.',
    agentId: 'manager',
    updated: 'Updated today',
  },
  {
    id: 'mem-2',
    title: 'Research sources: AI operators',
    collection: 'Research',
    content: 'Notes de veille sur les plateformes agents, automatisation et orchestration.',
    agentId: 'research',
    updated: 'Updated 2 h ago',
  },
  {
    id: 'mem-3',
    title: 'Architecture baseline',
    collection: 'Architecture',
    content: 'Next.js App Router, Supabase/Postgres, Cloudflare Workers et registry de tools indépendants.',
    agentId: 'builder',
    updated: 'Updated yesterday',
  },
];

export const executions: Execution[] = [
  {
    id: 'exec-1',
    missionId: 'm1',
    agentId: 'manager',
    status: 'completed',
    startedAt: '10:12',
    durationMs: 1840,
    outputSummary: 'Mission découpée en 3 étapes avec affectation initiale.',
  },
  {
    id: 'exec-2',
    missionId: 'm1',
    agentId: 'builder',
    status: 'running',
    startedAt: '10:18',
    durationMs: 4200,
    outputSummary: 'Construction du socle d’exécution en cours.',
  },
  {
    id: 'exec-3',
    missionId: 'm2',
    agentId: 'research',
    status: 'completed',
    startedAt: '09:44',
    durationMs: 9120,
    outputSummary: 'Brief concurrentiel prêt pour revue.',
  },
];

export const logs: LogEntry[] = [
  { id: 'log-1', level: 'info', source: 'Mission Engine', message: 'Mission m1 planned with 3 execution steps.', createdAt: '2 min ago' },
  { id: 'log-2', level: 'warning', source: 'Tool Manager', message: 'Web Search requires provider configuration before production use.', createdAt: '18 min ago' },
  { id: 'log-3', level: 'info', source: 'Memory Engine', message: 'Architecture baseline indexed in shared memory.', createdAt: '1 h ago' },
];

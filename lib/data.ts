export type Agent = { id: string; name: string; role: string; status: 'active' | 'idle'; color: string; tasks: number };
export const agents: Agent[] = [
  { id: 'research', name: 'Atlas', role: 'Research agent', status: 'active', color: 'bg-violet-500', tasks: 12 },
  { id: 'writer', name: 'Nova', role: 'Content agent', status: 'active', color: 'bg-cyan-500', tasks: 8 },
  { id: 'analyst', name: 'Pulse', role: 'Data analyst', status: 'idle', color: 'bg-amber-500', tasks: 4 },
];
export const missions = [
  { id: 'm1', title: 'Competitive intelligence brief', agent: 'Atlas', status: 'In progress', progress: 72, updated: '2 min ago' },
  { id: 'm2', title: 'Q3 content calendar', agent: 'Nova', status: 'Review', progress: 100, updated: '28 min ago' },
  { id: 'm3', title: 'Product usage analysis', agent: 'Pulse', status: 'Queued', progress: 0, updated: '1 h ago' },
];
export const memory = [
  ['Company positioning', 'Brand', 'Updated today'], ['Research sources: AI market', 'Research', 'Updated 2 h ago'], ['Content style guide', 'Brand', 'Updated yesterday'], ['Customer interview notes', 'Insights', 'Updated 3 days ago'],
];

import { memory } from '@/lib/data';
import type { MemoryItem } from '@/lib/domain/types';

export type MemoryQuery = {
  agentId?: string;
  collection?: string;
  search?: string;
};

export function queryMemory(query: MemoryQuery = {}): MemoryItem[] {
  const search = query.search?.toLowerCase();

  return memory.filter((item) => {
    const matchesAgent = !query.agentId || item.agentId === query.agentId;
    const matchesCollection = !query.collection || item.collection === query.collection;
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search) ||
      item.content.toLowerCase().includes(search) ||
      item.collection.toLowerCase().includes(search);

    return matchesAgent && matchesCollection && matchesSearch;
  });
}

export function createMemorySnapshot() {
  const collections = [...new Set(memory.map((item) => item.collection))];

  return {
    total: memory.length,
    collections,
    latest: memory[0],
  };
}

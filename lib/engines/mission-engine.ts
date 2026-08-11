import { agents } from '@/lib/data';
import type { MissionStep } from '@/lib/domain/types';

export type MissionPlanRequest = {
  title: string;
  objective: string;
  preferredAgentId?: string;
};

export type MissionPlan = {
  title: string;
  objective: string;
  manager: string;
  steps: MissionStep[];
  blockedTools: string[];
};

export function planMission(request: MissionPlanRequest): MissionPlan {
  const manager = agents.find((agent) => agent.id === 'manager') ?? agents[0];
  const worker = request.preferredAgentId
    ? agents.find((agent) => agent.id === request.preferredAgentId) ?? manager
    : agents.find((agent) => agent.id !== manager.id && agent.status !== 'paused') ?? manager;

  const steps: MissionStep[] = [
    {
      id: 'plan-1',
      title: 'Analyser l’objectif et les critères de succès',
      agentId: manager.id,
      toolIds: ['supabase'],
      status: 'queued',
    },
    {
      id: 'plan-2',
      title: 'Rechercher et vérifier les informations publiques',
      agentId: worker.id,
      toolIds: ['web-search'],
      status: 'queued',
    },
    {
      id: 'plan-3',
      title: 'Sauvegarder le résultat et mettre à jour le dashboard',
      agentId: manager.id,
      toolIds: ['supabase'],
      status: 'queued',
    },
  ];

  return {
    title: request.title,
    objective: request.objective,
    manager: manager.id,
    steps,
    blockedTools: [],
  };
}

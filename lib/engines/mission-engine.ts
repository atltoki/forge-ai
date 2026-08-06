import { agents, missions } from '@/lib/data';
import type { Mission, MissionStep } from '@/lib/domain/types';
import { checkToolAccess } from './tool-manager';

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

export function listMissions() {
  return missions;
}

export function getMission(id: string): Mission | undefined {
  return missions.find((mission) => mission.id === id);
}

export function planMission(request: MissionPlanRequest): MissionPlan {
  const manager = agents.find((agent) => agent.id === 'manager') ?? agents[0];
  const worker = request.preferredAgentId
    ? agents.find((agent) => agent.id === request.preferredAgentId) ?? manager
    : agents.find((agent) => agent.id !== manager.id && agent.status !== 'paused') ?? manager;

  const steps: MissionStep[] = [
    {
      id: 'plan-1',
      title: 'Clarifier l objectif et les criteres de succes',
      agentId: manager.id,
      toolIds: ['supabase'],
      status: 'queued',
    },
    {
      id: 'plan-2',
      title: 'Executer la mission avec les outils autorises',
      agentId: worker.id,
      toolIds: worker.tools,
      status: 'queued',
    },
    {
      id: 'plan-3',
      title: 'Sauvegarder le resultat et mettre a jour le dashboard',
      agentId: manager.id,
      toolIds: ['supabase'],
      status: 'queued',
    },
  ];

  const blockedTools = steps
    .flatMap((step) => step.toolIds)
    .filter((toolId, index, list) => list.indexOf(toolId) === index)
    .filter((toolId) => !checkToolAccess({ toolId, permission: 'read' }).allowed);

  return {
    title: request.title,
    objective: request.objective,
    manager: manager.id,
    steps,
    blockedTools,
  };
}

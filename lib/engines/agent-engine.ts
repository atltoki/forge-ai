import { agents, missions } from '@/lib/data';
import type { Agent, Mission } from '@/lib/domain/types';

export type AgentWithLoad = Agent & {
  activeMissionCount: number;
  queuedMissionCount: number;
};

export function listAgentsWithLoad(): AgentWithLoad[] {
  return agents.map((agent) => {
    const assignedMissions = missions.filter((mission) => mission.agentId === agent.id);

    return {
      ...agent,
      activeMissionCount: assignedMissions.filter((mission) => ['planning', 'running', 'review'].includes(mission.status)).length,
      queuedMissionCount: assignedMissions.filter((mission) => mission.status === 'queued').length,
    };
  });
}

export function selectAgentForMission(requiredToolIds: string[]): Agent | null {
  const candidates = agents
    .filter((agent) => agent.status === 'active' || agent.status === 'idle')
    .filter((agent) => requiredToolIds.every((toolId) => agent.tools.includes(toolId)));

  return candidates.sort((left, right) => left.missionsThisWeek - right.missionsThisWeek)[0] ?? null;
}

export function getAgentMissionHistory(agentId: string): Mission[] {
  return missions.filter((mission) => mission.agentId === agentId);
}

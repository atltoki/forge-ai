export type AgentStatus = 'active' | 'idle' | 'paused' | 'error';
export type MissionStatus = 'queued' | 'planning' | 'running' | 'review' | 'completed' | 'failed';
export type ToolStatus = 'enabled' | 'disabled' | 'needs_config';
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed';
export type LogLevel = 'info' | 'warning' | 'error';

export type ToolPermission = 'read' | 'write' | 'execute' | 'external_request';

export type Tool = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: ToolStatus;
  permissions: ToolPermission[];
  provider: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: AgentStatus;
  color: string;
  objectives: string[];
  tools: string[];
  memoryCollections: string[];
  missionsThisWeek: number;
};

export type MissionStep = {
  id: string;
  title: string;
  agentId: string;
  toolIds: string[];
  status: ExecutionStatus;
};

export type Mission = {
  id: string;
  title: string;
  objective: string;
  agentId: string;
  status: MissionStatus;
  progress: number;
  updated: string;
  steps: MissionStep[];
};

export type MemoryItem = {
  id: string;
  title: string;
  collection: string;
  content: string;
  agentId?: string;
  updated: string;
};

export type Execution = {
  id: string;
  missionId: string;
  agentId: string;
  status: ExecutionStatus;
  startedAt: string;
  durationMs: number;
  outputSummary: string;
};

export type LogEntry = {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  createdAt: string;
};

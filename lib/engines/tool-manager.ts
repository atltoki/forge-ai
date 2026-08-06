import { tools } from '@/lib/data';
import type { Tool, ToolPermission } from '@/lib/domain/types';

export type ToolRequest = {
  toolId: string;
  permission: ToolPermission;
};

export type ToolCheck = {
  allowed: boolean;
  tool?: Tool;
  reason?: string;
};

export function listTools() {
  return tools;
}

export function checkToolAccess(request: ToolRequest): ToolCheck {
  const tool = tools.find((item) => item.id === request.toolId);

  if (!tool) return { allowed: false, reason: 'Tool not found' };
  if (tool.status !== 'enabled') return { allowed: false, tool, reason: 'Tool is not enabled' };
  if (!tool.permissions.includes(request.permission)) {
    return { allowed: false, tool, reason: 'Permission denied' };
  }

  return { allowed: true, tool };
}

export function summarizeToolRegistry() {
  const enabled = tools.filter((tool) => tool.status === 'enabled').length;
  const needsConfig = tools.filter((tool) => tool.status === 'needs_config').length;

  return {
    total: tools.length,
    enabled,
    needsConfig,
    disabled: tools.length - enabled - needsConfig,
  };
}

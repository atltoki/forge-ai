import { describe, expect, it } from 'vitest';
import { planMission } from '@/lib/engines/mission-engine';

describe('mission planning', () => {
  it('creates a deterministic research pipeline', () => {
    const plan = planMission({ title: 'Prospection Portugal', objective: 'Trouver des transporteurs vérifiés' });
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps.map((step) => step.toolIds).flat()).toContain('web-search');
    expect(plan.steps.every((step) => step.status === 'queued')).toBe(true);
    expect(plan.blockedTools).toEqual([]);
  });
});

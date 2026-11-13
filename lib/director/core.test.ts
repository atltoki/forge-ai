import { describe, expect, it } from 'vitest';
import { mayRunWithoutApproval, priorityScore, proposeCycle, rankPortfolio, type DirectorProject } from './core';

const sample: DirectorProject = {
  id: 'p1', slug: 'locksability', name: 'Locksability', stage: 'unverified',
  revenue_potential: 3, urgency: 4, alignment: 5, evidence: 0, effort: 2, risk: 1,
};

describe('ATL DIRECTOR guardrails', () => {
  it('never implicitly authorizes external writes or destructive actions', () => {
    for (const action of ['branch_write', 'deploy', 'outreach', 'spend', 'destructive'] as const) {
      expect(mayRunWithoutApproval(action)).toBe(false);
    }
    expect(mayRunWithoutApproval('observe')).toBe(true);
    expect(mayRunWithoutApproval('draft')).toBe(true);
  });
  it('penalizes missing evidence without inventing measured outcomes', () => {
    expect(priorityScore(sample)).toBeLessThan(priorityScore({ ...sample, stage: 'live', evidence: 3 }));
    expect(priorityScore({ ...sample, stage: 'paused' })).toBe(0);
  });
  it('caps missions to two and does not mutate the input', () => {
    const projects = [sample, ...Array.from({ length: 4 }, (_, i) => ({ ...sample, id: String(i + 2), slug: `repo-${i}`, name: `Repo ${i}` }))];
    const snapshot = JSON.stringify(projects);
    expect(proposeCycle(projects, [], 99)).toHaveLength(2);
    expect(JSON.stringify(projects)).toBe(snapshot);
  });
  it('avoids repeating an already proposed action', () => {
    expect(proposeCycle([sample], ['locksability:verify'])).toHaveLength(0);
  });
  it('sorts by a transparent score', () => {
    const higher = { ...sample, id: 'p2', slug: 'high', name: 'High', evidence: 5, stage: 'live' as const };
    expect(rankPortfolio([sample, higher])[0].id).toBe('p2');
  });
  it('only proposes harmless research when evidence is absent', () => {
    const proposed = proposeCycle([sample])[0];
    expect(proposed.action_kind).toBe('observe');
    expect(proposed.objective).toMatch(/Ne rien modifier/);
    expect(proposed.status).toBe('proposed');
  });
});

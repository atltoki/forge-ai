import { describe, expect, it } from 'vitest';
import { parseOrbitPortfolio } from './orbit';

describe('ORBIT read-only adapter', () => {
  it('maps known IDs to existing projects, without inventing evidence metrics', () => {
    const result = parseOrbitPortfolio({records:{locks:{
      state:'usage',focus:true,nextAction:'Vérifier les tarifs',reviewDate:'2026-11-20',
      evidenceUrl:'https://example.com',note:'Suivi',history:[{secret:'not imported'}],
    } }}, '2026-11-13T00:00:00Z');
    expect(result[0].slug).toBe('locksability');
    expect(result[0].stage).toBe('live');
    expect(result[0].orbit_focus).toBe(true);
    expect(result[0]).not.toHaveProperty('history');
    expect(result[0]).not.toHaveProperty('revenue_potential');
  });
  it('rejects invalid records and unsafe evidence URLs', () => {
    expect(parseOrbitPortfolio({records:{'../../test':{},orbit:{evidenceUrl:'javascript:alert(1)'}}})).toMatchObject([
      {orbit_project_id:'orbit',orbit_evidence_url:''},
    ]);
  });
  it('keeps empty portfolios empty rather than claiming observations', () => {
    expect(parseOrbitPortfolio({records:{}})).toEqual([]);
  });
  it('fails closed on non-ORBIT payloads', () => {
    expect(() => parseOrbitPortfolio({items:[]})).toThrow();
  });
});

/** Safe projection of ORBIT's Cloudflare KV portfolio into ATL DIRECTOR. */
import type { Stage } from './core';

const knownNames: Record<string, { slug: string; name: string }> = {
  forgeai: { slug: 'forge-ai', name: 'Forge AI' },
  locks: { slug: 'locksability', name: 'Locksability' },
  atlos: { slug: 'atl-os', name: 'ATL OS' },
  orbit: { slug: 'orbit', name: 'ORBIT' },
  atlyn: { slug: 'atlyn', name: 'ATLYN' },
  kern: { slug: 'kern', name: 'KERN' },
  halo: { slug: 'halo', name: 'HALO' },
  camila: { slug: 'camila-rios', name: 'Camila Rios' },
  bolide: { slug: 'bolide', name: 'BOLIDE' },
  forgeatl: { slug: 'forge-atl', name: 'ForgeATL' },
};
export const ORBIT_STATES = ['clarifier','construction','usage','pause','archive'] as const;

export type OrbitRecord = {
  state?: string;
  focus?: boolean;
  nextAction?: string;
  reviewDate?: string;
  evidenceUrl?: string;
  note?: string;
  updatedAt?: string;
  revision?: string;
};
export type OrbitProject = {
  orbit_project_id: string;
  slug: string;
  name: string;
  stage: Stage;
  orbit_focus: boolean;
  orbit_next_action: string;
  orbit_note: string;
  orbit_evidence_url: string;
  orbit_review_date: string | null;
  orbit_revision: string;
  orbit_last_sync_at: string;
};
const safeText = (v: unknown, limit: number): string => typeof v === 'string' ? v.slice(0, limit).trim() : '';

export function projectFromOrbit(id: string, raw: OrbitRecord, now: string): OrbitProject | null {
  if (!/^[a-z0-9][a-z0-9-]{0,45}$/.test(id) || !raw || typeof raw !== 'object') return null;
  const stage: Stage = raw.state === 'clarifier' ? 'idea' : raw.state === 'construction' ? 'building'
    : raw.state === 'usage' ? 'live' : ['pause', 'archive'].includes(raw.state || '') ? 'paused' : 'unverified';
  const info = knownNames[id] || { slug: `orbit-${id}`, name: id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) };
  const evidence = safeText(raw.evidenceUrl, 400);
  const review = safeText(raw.reviewDate, 10);
  return {
    orbit_project_id: id, slug: info.slug, name: info.name, stage,
    orbit_focus: raw.focus === true,
    orbit_next_action: safeText(raw.nextAction, 180),
    orbit_note: safeText(raw.note, 700),
    orbit_evidence_url: /^https:\/\//i.test(evidence) ? evidence : '',
    orbit_review_date: /^\d{4}-\d{2}-\d{2}$/.test(review) && !Number.isNaN(Date.parse(review)) ? review : null,
    orbit_revision: safeText(raw.revision, 80),
    orbit_last_sync_at: now,
  };
}

export function parseOrbitPortfolio(payload: unknown, now = new Date().toISOString()): OrbitProject[] {
  if (!payload || typeof payload !== 'object' || !('records' in payload)) throw new Error('Format ORBIT inattendu');
  const records = (payload as {records: unknown}).records;
  if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('Registre ORBIT invalide');
  return Object.entries(records).slice(0, 100).map(([id, raw]) =>
    projectFromOrbit(id, raw as OrbitRecord, now)).filter((item): item is OrbitProject => item !== null);
}

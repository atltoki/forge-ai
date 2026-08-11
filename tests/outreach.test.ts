import { describe, expect, it } from 'vitest';
import { addDaysIso, buildOutreachSequence, mailtoUrl } from '@/lib/domain/outreach';

describe('ATLYN outreach sequence', () => {
  const now = new Date('2026-08-11T15:00:00.000Z');

  it('creates three personalized and scheduled messages', () => {
    const sequence = buildOutreachSequence({ companyName: 'Acme Transport', contactName: 'Ana Silva', activity: 'Fret routier', city: 'Porto', qualification: 'Flotte nationale' }, now);
    expect(sequence).toHaveLength(3);
    expect(sequence[0].body).toContain('Bonjour Ana');
    expect(sequence[0].body).toContain('Flotte nationale');
    expect(sequence[1].scheduledAt).toBe('2026-08-14T09:00:00.000Z');
    expect(sequence[2].scheduledAt).toBe('2026-08-18T09:00:00.000Z');
  });

  it('uses a neutral greeting when no contact is known', () => {
    expect(buildOutreachSequence({ companyName: 'Acme' }, now)[0].body).toMatch(/^Bonjour,/);
  });

  it('builds safe mailto links and deterministic dates', () => {
    expect(mailtoUrl('contact@example.com', 'Bonjour & suite', 'Ligne 1\nLigne 2')).toContain('subject=Bonjour%20%26%20suite');
    expect(addDaysIso(now, 3)).toBe('2026-08-14T09:00:00.000Z');
  });
});

import { describe, expect, it } from 'vitest';
import { extractPublicContact, parseProspects, prospectsToCsv, scoreProspect } from '@/lib/domain/prospects';

describe('prospect result parsing', () => {
  it('turns Atlas markdown into qualified records', () => {
    const [prospect] = parseProspects(`Résumé\n\n## Acme Transport\nSite : https://acme.pt\nVille : Porto\nActivité : Fret routier\nQualification : Correspond à la cible\nContact : Ana Silva\nEmail : ana@acme.pt\nTéléphone : +351 123\nSource : https://annuaire.pt/acme`);
    expect(prospect).toMatchObject({ companyName: 'Acme Transport', website: 'https://acme.pt', city: 'Porto', email: 'ana@acme.pt', score: 100 });
  });

  it('does not persist placeholder values', () => {
    const [prospect] = parseProspects('## Entreprise Test\nSite : introuvable\nVille : Lisbonne\nEmail : non trouvé');
    expect(prospect.website).toBe('');
    expect(prospect.email).toBe('');
    expect(prospect.score).toBe(30);
  });

  it('escapes prospect exports', () => {
    const prospect = { companyName: 'A, "B"', website: '', city: '', activity: '', qualification: '', contactName: '', email: '', phone: '', linkedinUrl: '', sourceUrl: '', score: 20 };
    expect(prospectsToCsv([prospect])).toContain('"A, ""B"""');
    expect(scoreProspect(prospect)).toBe(20);
  });

  it('downgrades prospects clearly outside the requested market', () => {
    const [prospect] = parseProspects('## Transport Test\nSite : https://example.ca\nVille : Québec\nActivité : Transport\nQualification : Entreprise située au Canada.', [], 'Trouve des entreprises au Portugal');
    expect(prospect.score).toBeLessThanOrEqual(40);
    const [tunisian] = parseProspects('## STS\nSite : https://example.tn\nActivité : Transport\nQualification : Entreprise publique tunisienne.', [], 'Entreprises au Portugal');
    expect(tunisian.score).toBeLessThanOrEqual(40);
  });

  it('extracts and prioritizes official professional contact details', () => {
    const contact = extractPublicContact([
      { url: 'https://directory.test/acme', content: 'Contact directory@example.test' },
      { url: 'https://acme.pt/contact', content: 'Éthique etica@acme.pt · E-mail geral@acme.pt · Telefone +351 210 123 456' },
      { url: 'https://linkedin.com/company/acme' },
    ], 'https://www.acme.pt');
    expect(contact.email).toBe('geral@acme.pt');
    expect(contact.phone).toBe('+351 210 123 456');
    expect(contact.linkedinUrl).toContain('linkedin.com/company/acme');
  });

  it('rejects stale personal addresses without a decision-maker role', () => {
    const contact = extractPublicContact([
      { url: 'https://acme.pt/report-2015.pdf', content: 'claudia.silva@acme.pt' },
      { url: 'https://acme.pt/team', content: 'Diretora Comercial Ana Silva ana.silva@acme.pt' },
    ], 'https://acme.pt');
    expect(contact.email).toBe('ana.silva@acme.pt');
  });
});

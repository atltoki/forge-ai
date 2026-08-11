export const prospectStatuses = ['new', 'qualified', 'contacted', 'interested', 'won', 'archived'] as const;
export type ProspectStatus = typeof prospectStatuses[number];

export type ParsedProspect = {
  companyName: string;
  website: string;
  city: string;
  activity: string;
  qualification: string;
  contactName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  sourceUrl: string;
  score: number;
};

const FIELD_ALIASES: Record<string, keyof Omit<ParsedProspect, 'companyName' | 'score'>> = {
  site: 'website',
  'site web': 'website',
  url: 'website',
  ville: 'city',
  localisation: 'city',
  activité: 'activity',
  activite: 'activity',
  qualification: 'qualification',
  contact: 'contactName',
  'nom du contact': 'contactName',
  email: 'email',
  'e-mail': 'email',
  téléphone: 'phone',
  telephone: 'phone',
  linkedin: 'linkedinUrl',
  source: 'sourceUrl',
};

function cleanValue(value: string) {
  const normalized = value.replace(/^[-*]\s*/, '').trim();
  return /^(introuvable|non trouvé|non trouve|n\/a|inconnu)$/i.test(normalized) ? '' : normalized;
}

function urlFrom(value: string) {
  const match = value.match(/https?:\/\/[^\s)>]+/i);
  return match?.[0].replace(/[.,;]+$/, '') ?? '';
}

export function scoreProspect(prospect: Omit<ParsedProspect, 'score'>, objective = '') {
  let score = 20;
  if (prospect.website) score += 20;
  if (prospect.city) score += 10;
  if (prospect.activity) score += 15;
  if (prospect.qualification) score += 15;
  if (prospect.email || prospect.phone || prospect.contactName) score += 15;
  if (prospect.sourceUrl) score += 5;
  const assessment = `${prospect.qualification} ${prospect.city}`.toLocaleLowerCase('fr-FR');
  const negative = /hors cible|ne correspond pas|non pertinent|à exclure|a exclure/.test(assessment);
  const requestedPortugal = /\bportugal\b/i.test(objective);
  const clearlyOutsidePortugal = /\b(canada|québec|quebec|france|belgique|suisse|tunisie|tunisien|tunisienne)\b/i.test(assessment);
  if (negative || (requestedPortugal && clearlyOutsidePortugal)) return Math.min(score, 40);
  return Math.min(score, 100);
}

export function parseProspects(result: string, fallbackSources: Array<{ url?: string }> = [], objective = ''): ParsedProspect[] {
  const blocks = result.split(/^##\s+/m).slice(1);
  const fallbackUrl = fallbackSources.find((source) => source.url?.startsWith('http'))?.url ?? '';

  return blocks.flatMap((block) => {
    const [heading = '', ...lines] = block.trim().split('\n');
    const companyName = heading.replace(/^\d+[.)]\s*/, '').trim();
    if (!companyName) return [];

    const prospect: Omit<ParsedProspect, 'score'> = {
      companyName,
      website: '',
      city: '',
      activity: '',
      qualification: '',
      contactName: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      sourceUrl: fallbackUrl,
    };

    for (const line of lines) {
      const match = line.match(/^\s*[-*]?\s*([^:]{2,30})\s*:\s*(.+)$/);
      if (!match) continue;
      const alias = FIELD_ALIASES[match[1].trim().toLocaleLowerCase('fr-FR')];
      if (!alias) continue;
      const value = cleanValue(match[2]);
      if (alias === 'website' || alias === 'linkedinUrl' || alias === 'sourceUrl') prospect[alias] = urlFrom(value);
      else prospect[alias] = value;
    }

    if (!prospect.sourceUrl) prospect.sourceUrl = prospect.website || fallbackUrl;
    return [{ ...prospect, score: scoreProspect(prospect, objective) }];
  });
}

export function prospectsToCsv(prospects: ParsedProspect[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const headers = ['Entreprise', 'Score', 'Site', 'Ville', 'Activité', 'Qualification', 'Contact', 'Email', 'Téléphone', 'LinkedIn', 'Source'];
  return [headers.map(escape).join(','), ...prospects.map((prospect) => [prospect.companyName, prospect.score, prospect.website, prospect.city, prospect.activity, prospect.qualification, prospect.contactName, prospect.email, prospect.phone, prospect.linkedinUrl, prospect.sourceUrl].map(escape).join(','))].join('\n');
}

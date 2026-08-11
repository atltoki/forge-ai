export const outreachStatuses = ['draft', 'sent', 'replied', 'skipped'] as const;
export type OutreachStatus = typeof outreachStatuses[number];

export type OutreachProspect = {
  companyName: string;
  contactName?: string;
  activity?: string;
  city?: string;
  qualification?: string;
};

export type OutreachDraft = {
  step: number;
  subject: string;
  body: string;
  scheduledAt: string;
};

function cleanSentence(value = '') {
  return value.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
}

function greeting(contactName = '') {
  const firstName = cleanSentence(contactName).split(/\s+/)[0];
  return firstName ? `Bonjour ${firstName},` : 'Bonjour,';
}

export function addDaysIso(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(9, 0, 0, 0);
  return result.toISOString();
}

export function buildOutreachSequence(prospect: OutreachProspect, now = new Date()): OutreachDraft[] {
  const company = cleanSentence(prospect.companyName) || 'votre entreprise';
  const activity = cleanSentence(prospect.activity);
  const city = cleanSentence(prospect.city);
  const reason = cleanSentence(prospect.qualification);
  const context = [activity, city ? `à ${city}` : ''].filter(Boolean).join(' ');
  const personalisation = reason
    ? `En découvrant ${company}, j’ai retenu ce point : ${reason}.`
    : `Votre activité${context ? ` dans ${context}` : ''} a retenu mon attention.`;
  const hello = greeting(prospect.contactName);

  return [
    {
      step: 1,
      subject: `Échange avec ${company}`,
      body: `${hello}\n\n${personalisation}\n\nJe vous contacte de la part d’ATLYN afin de comprendre vos priorités actuelles et de voir si une collaboration pourrait être pertinente. Seriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nBien cordialement,\nL’équipe ATLYN`,
      scheduledAt: addDaysIso(now, 0),
    },
    {
      step: 2,
      subject: `Re: Échange avec ${company}`,
      body: `${hello}\n\nJe me permets de revenir vers vous concernant mon précédent message. Le sujet est-il pertinent pour ${company} en ce moment ?\n\nUn échange de 15 minutes suffit pour déterminer rapidement si cela mérite d’aller plus loin.\n\nBien cordialement,\nL’équipe ATLYN`,
      scheduledAt: addDaysIso(now, 3),
    },
    {
      step: 3,
      subject: `Dernier message — ${company}`,
      body: `${hello}\n\nJe vous adresse un dernier message afin de ne pas encombrer votre boîte de réception. Si le moment n’est pas opportun, je peux revenir vers vous plus tard.\n\nSinon, dites-moi simplement quel créneau vous conviendrait pour un bref échange.\n\nBien cordialement,\nL’équipe ATLYN`,
      scheduledAt: addDaysIso(now, 7),
    },
  ];
}

export function mailtoUrl(email: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

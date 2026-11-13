/**
 * ATL DIRECTOR v0.1: deterministic, auditable portfolio decision engine.
 * No LLM or tool execution happens in this module.
 */
export type Stage = 'unverified' | 'idea' | 'building' | 'live' | 'paused';
export type Metric = 0 | 1 | 2 | 3 | 4 | 5;
export type ActionKind = 'observe' | 'draft' | 'branch_write' | 'deploy' | 'outreach' | 'spend' | 'destructive';

export type DirectorProject = {
  id: string;
  slug: string;
  name: string;
  stage: Stage;
  revenue_potential: number;
  urgency: number;
  alignment: number;
  evidence: number;
  effort: number;
  risk: number;
};

export type DirectorProposal = {
  project_id: string;
  proposal_key: string;
  title: string;
  objective: string;
  rationale: string;
  agent_key: 'research' | 'builder';
  action_kind: ActionKind;
  requires_approval: boolean;
  priority_score: number;
  status: 'proposed';
};

export const MAX_PARALLEL_MISSIONS = 2;
export const MAX_PROPOSALS_PER_CYCLE = 2;

/** No write to external systems is ever auto-approved. */
export function mayRunWithoutApproval(kind: ActionKind): boolean {
  return kind === 'observe' || kind === 'draft';
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
}

/** Transparent heuristic, not a claim of measured financial return. */
export function priorityScore(p: DirectorProject): number {
  if (p.stage === 'paused') return 0;
  const raw =
    5 * clamp(p.revenue_potential) +
    4 * clamp(p.urgency) +
    3 * clamp(p.alignment) +
    2 * clamp(p.evidence) +
    2 * (5 - clamp(p.effort)) -
    4 * clamp(p.risk);
  const normalized = Math.max(0, Math.min(100, Math.round(raw / 80 * 100)));
  return p.stage === 'unverified' || p.evidence === 0
    ? Math.round(normalized * 0.6)
    : normalized;
}

export function rankPortfolio(projects: DirectorProject[]): DirectorProject[] {
  return [...projects].sort((a, b) =>
    priorityScore(b) - priorityScore(a) || a.name.localeCompare(b.name, 'fr'),
  );
}

function nextAction(p: DirectorProject) {
  if (p.stage === 'unverified' || p.evidence < 2) return {
    suffix: 'verify',
    title: `Vérifier la situation réelle de ${p.name}`,
    objective: 'Examiner les sources et dépôts autorisés, identifier le statut réel, les preuves, les blocages et les prochaines décisions. Ne rien modifier.',
    rationale: 'Les informations de départ sont insuffisantes pour décider de façon fiable.',
    agent_key: 'research' as const, action_kind: 'observe' as const,
  };
  if (p.stage === 'idea') return {
    suffix: 'validate',
    title: `Valider le potentiel de ${p.name}`,
    objective: 'Documenter le besoin client, la concurrence, le prix plausible et un test de demande avant de développer.',
    rationale: 'Une idée doit être validée avant de consommer des ressources techniques.',
    agent_key: 'research' as const, action_kind: 'draft' as const,
  };
  if (p.stage === 'building') return {
    suffix: 'quality',
    title: `Préparer la revue technique de ${p.name}`,
    objective: 'Auditer la branche existante, les parcours critiques, les risques et les tests. Proposer un plan de corrections, sans déployer.',
    rationale: 'La qualité du parcours principal prime sur l’ajout de fonctions secondaires.',
    agent_key: 'builder' as const, action_kind: 'observe' as const,
  };
  return {
    suffix: 'conversion',
    title: `Analyser la conversion de ${p.name}`,
    objective: 'Examiner les parcours et indicateurs disponibles, identifier trois expériences mesurables, sans contacter de clients.',
    rationale: 'Un produit disponible doit être évalué par son usage et ses résultats.',
    agent_key: 'research' as const, action_kind: 'observe' as const,
  };
}

export function proposeCycle(
  projects: DirectorProject[],
  existingProposalKeys: string[] = [],
  limit = MAX_PROPOSALS_PER_CYCLE,
): DirectorProposal[] {
  const seen = new Set(existingProposalKeys);
  const proposals: DirectorProposal[] = [];
  for (const p of rankPortfolio(projects)) {
    if (p.stage === 'paused' || proposals.length >= Math.max(0, Math.min(limit, MAX_PARALLEL_MISSIONS))) continue;
    const action = nextAction(p);
    const key = `${p.slug}:${action.suffix}`;
    if (seen.has(key)) continue;
    const proposal: DirectorProposal = {
      project_id: p.id,
      proposal_key: key,
      title: action.title,
      objective: action.objective,
      rationale: action.rationale,
      agent_key: action.agent_key,
      action_kind: action.action_kind,
      requires_approval: !mayRunWithoutApproval(action.action_kind),
      priority_score: priorityScore(p),
      status: 'proposed',
    };
    proposals.push(proposal);
    seen.add(key);
  }
  return proposals;
}

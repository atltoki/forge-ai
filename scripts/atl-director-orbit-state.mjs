/**
 * Classify an ORBIT priorities response without inventing state or freshness.
 * This module is pure and safe to run using node --test (no external I/O).
 */
export function classifyOrbitPriorities(payload, checkedAt = new Date().toISOString(), maxAgeDays = 7) {
  const envelope = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  const priorities = Array.isArray(payload) ? payload
    : Array.isArray(envelope?.priorities) ? envelope.priorities : null;

  if (!priorities) {
    return {
      status: 'unrecognized_format',
      count: null,
      priorities: [],
      checked_at: checkedAt,
      updated_at: null,
      freshness: 'unknown',
      warning: 'ORBIT a repondu, mais son format de priorites est inconnu. Aucune priorite ne peut etre confirmee.',
    };
  }

  const rawDate = envelope?.updated_at ?? envelope?.updatedAt ?? null;
  const updatedMs = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(rawDate)
    ? Date.parse(rawDate) : NaN;
  const nowMs = Date.parse(checkedAt);
  const validDate = Number.isFinite(updatedMs) && Number.isFinite(nowMs)
    && updatedMs <= nowMs + 5 * 60 * 1000;
  const maxAge = Number.isFinite(maxAgeDays) && maxAgeDays > 0
    ? Math.min(maxAgeDays, 90) : 7;
  const freshness = !validDate ? 'unknown'
    : nowMs - updatedMs > maxAge * 86400000 ? 'stale' : 'recent';

  const empty = priorities.length === 0;
  return {
    status: empty ? 'observed_empty' : 'observed',
    count: priorities.length,
    priorities,
    checked_at: checkedAt,
    updated_at: validDate ? new Date(updatedMs).toISOString() : null,
    freshness,
    warning: empty
      ? 'La source locale ORBIT retourne une liste vide. Ne pas inventer de priorites et ne pas ecraser celles eventuellement stockees dans un navigateur.'
      : freshness === 'stale'
        ? 'La source ORBIT a une date de derniere mise a jour ancienne : verifier avant de prioriser.'
        : freshness === 'unknown'
          ? 'La date de derniere modification des priorites ORBIT est inconnue : ne pas supposer leur fraicheur.'
          : null,
  };
}

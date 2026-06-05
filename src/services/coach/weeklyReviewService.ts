// ── Coach MVP: weekly review (stub) ────────────────────────────────────────────
// Intentionally minimal for the MVP. Later this will compose beliefs, evidence,
// and recommendations into a tutor-style weekly report. For now it exposes a
// lightweight summary so the surface exists without committing to the full design.

import type { CoachBeliefSnapshot } from '../../types/beliefs';
import { getBeliefSnapshot, getRecentEvidence } from './coachStorage';
import { getSkillLabel } from './skillGraph';

export interface WeeklyReviewSummary {
  generatedAt: string;
  sessionsObserved: number;
  focusAreas: string[];
  hasData: boolean;
}

export function getWeeklyReviewSummary(snapshot?: CoachBeliefSnapshot | null): WeeklyReviewSummary {
  const snap = snapshot ?? getBeliefSnapshot();
  const evidence = getRecentEvidence(50);

  if (!snap) {
    return { generatedAt: new Date().toISOString(), sessionsObserved: 0, focusAreas: [], hasData: false };
  }

  return {
    generatedAt: new Date().toISOString(),
    sessionsObserved: evidence.length,
    focusAreas: snap.weakestSkillIds.slice(0, 3).map(getSkillLabel),
    hasData: evidence.length > 0,
  };
}

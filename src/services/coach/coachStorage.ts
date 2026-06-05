// ── Coach MVP: local persistence ───────────────────────────────────────────────
// Thin, fail-safe wrapper around localStorage for the coach's evidence log, belief
// snapshot, active recommendation, and goals. Bounded history keeps storage small.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { EvidenceEvent } from '../../types/evidence';
import type { CoachBeliefSnapshot } from '../../types/beliefs';
import type { CoachRecommendation, CoachGoal } from '../../types/coach';

/** Cap the evidence log so localStorage never grows unbounded. */
const MAX_EVIDENCE_EVENTS = 100;

export const LEARNER_ID = 'local-user';

// ── Evidence ────────────────────────────────────────────────────────────────

export function getEvidenceEvents(): EvidenceEvent[] {
  return storageGet<EvidenceEvent[]>(STORAGE_KEYS.coachEvidence, []);
}

/** Append events, keeping only the most recent MAX_EVIDENCE_EVENTS. */
export function appendEvidenceEvents(events: EvidenceEvent[]): EvidenceEvent[] {
  if (events.length === 0) return getEvidenceEvents();
  const existing = getEvidenceEvents();
  const next = [...existing, ...events].slice(-MAX_EVIDENCE_EVENTS);
  storageSet(STORAGE_KEYS.coachEvidence, next);
  return next;
}

/** Most recent N evidence events, newest first. */
export function getRecentEvidence(limit = 20): EvidenceEvent[] {
  const all = getEvidenceEvents();
  return [...all].reverse().slice(0, limit);
}

// ── Belief snapshot ───────────────────────────────────────────────────────────

export function getBeliefSnapshot(): CoachBeliefSnapshot | null {
  return storageGet<CoachBeliefSnapshot | null>(STORAGE_KEYS.coachBeliefs, null);
}

export function saveBeliefSnapshot(snapshot: CoachBeliefSnapshot): void {
  storageSet(STORAGE_KEYS.coachBeliefs, snapshot);
}

// ── Recommendation ──────────────────────────────────────────────────────────

export function getRecommendation(): CoachRecommendation | null {
  return storageGet<CoachRecommendation | null>(STORAGE_KEYS.coachRecommendation, null);
}

export function saveRecommendation(rec: CoachRecommendation): void {
  storageSet(STORAGE_KEYS.coachRecommendation, rec);
}

// ── Goals ──────────────────────────────────────────────────────────────────

export function getGoals(): CoachGoal[] {
  return storageGet<CoachGoal[]>(STORAGE_KEYS.coachGoals, []);
}

export function saveGoals(goals: CoachGoal[]): void {
  storageSet(STORAGE_KEYS.coachGoals, goals);
}

/**
 * Returns the active goal, defaulting to a general speaking goal if none has been
 * set. The default is persisted so subsequent reads are stable.
 */
export function getActiveGoal(): CoachGoal {
  const goals = getGoals();
  const active = goals.find(g => g.active);
  if (active) return active;

  const fallback: CoachGoal = {
    id: 'goal-default',
    type: 'general_speaking',
    label: 'General Speaking',
    createdAt: new Date().toISOString(),
    active: true,
  };
  saveGoals([fallback, ...goals.filter(g => g.id !== fallback.id)]);
  return fallback;
}

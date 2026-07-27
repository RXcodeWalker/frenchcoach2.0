// ── Coach MVP: local persistence ───────────────────────────────────────────────
// Thin, fail-safe wrapper around localStorage for the coach's evidence log, belief
// snapshot, active recommendation, and goals. Bounded history keeps storage small.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { EvidenceEvent } from '../../types/evidence';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type { CoachRecommendation } from '../../types/coach';
import {
  reduceEvidenceToBeliefState,
  projectEvidenceBeliefSnapshot,
  REDUCER_VERSION,
} from './beliefReducer';
import { getSkillProfile } from '../coaching/diagnosticEngine';
import { LEARNER_ID } from './learnerId';

/** Cap the evidence log so localStorage never grows unbounded. */
export const MAX_EVIDENCE_EVENTS = 100;

export { LEARNER_ID };

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

/**
 * Return the coach's evidence-derived belief snapshot. Includes a version guard:
 * if the stored snapshot was produced by an older reducer (or is missing while
 * evidence exists), it is rebuilt from the full evidence log and re-persisted so
 * consumers never read stale beliefs after a reducer upgrade.
 */
export function getBeliefSnapshot(): EvidenceBeliefSnapshot | null {
  const stored = storageGet<EvidenceBeliefSnapshot | null>(STORAGE_KEYS.coachBeliefs, null);
  if (stored && stored.reducerVersion === REDUCER_VERSION) return stored;

  const events = getEvidenceEvents();
  if (events.length === 0) return stored;

  const rebuilt = projectEvidenceBeliefSnapshot(
    reduceEvidenceToBeliefState(events),
    getSkillProfile(),
    LEARNER_ID,
  );
  storageSet(STORAGE_KEYS.coachBeliefs, rebuilt);
  return rebuilt;
}

export function saveBeliefSnapshot(snapshot: EvidenceBeliefSnapshot): void {
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
// Goal ownership is unified on coachProfileService (see getActiveGoal there).
// The previous duplicate goal store that lived here has been removed so the
// recommendation and decision engines read a single canonical active goal.

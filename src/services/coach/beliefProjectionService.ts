// ── Coach MVP: belief projection (evidence-driven) ─────────────────────────────
// The diagnostic engine (frenchCoach_sde) stays live for legacy UI (Progress,
// SessionStartScreen, AppContext skill profile). This service drives it
// (runAfterSession) so that path keeps working, but the COACH read model is now
// the evidence-derived EvidenceBeliefSnapshot produced by beliefReducer from the
// EvidenceEvent log. Recommendations, the daily plan, and interventions all read
// that snapshot; diagnosticEngine is only consulted as a sparse-evidence fallback.

import type { FeedbackV2, AvoidanceSignal } from '../../types';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import { runAfterSession, getSkillProfile } from '../coaching/diagnosticEngine';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot } from './beliefReducer';
import { LEARNER_ID, getEvidenceEvents, saveBeliefSnapshot } from './coachStorage';

/**
 * Rebuild the evidence-derived belief snapshot from the full evidence log and
 * persist it. The diagnostic profile is passed as a fallback for skills that do
 * not yet have enough evidence to be modelled directly.
 *
 * Replaying the (bounded) evidence log on each call is acceptable at MVP scale;
 * the reducer caps the log and the projection is cheap.
 */
export function rebuildBeliefSnapshot(): EvidenceBeliefSnapshot {
  const events = getEvidenceEvents();
  const beliefState = reduceEvidenceToBeliefState(events);
  const snapshot = projectEvidenceBeliefSnapshot(beliefState, getSkillProfile(), LEARNER_ID);
  saveBeliefSnapshot(snapshot);
  return snapshot;
}

/**
 * Drive the diagnostic engine from a completed answer (legacy UI), then rebuild
 * and persist the coach's evidence-driven belief snapshot. The orchestrator must
 * append this attempt's evidence BEFORE calling this so the snapshot reflects it.
 */
export function updateFromFeedback(
  feedback: FeedbackV2,
  avoidanceSignals: AvoidanceSignal[],
): EvidenceBeliefSnapshot {
  runAfterSession(feedback, avoidanceSignals);
  return rebuildBeliefSnapshot();
}

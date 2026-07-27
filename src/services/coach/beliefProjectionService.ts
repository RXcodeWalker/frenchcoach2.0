// ── Coach MVP: belief projection (evidence-driven) ─────────────────────────────
// The diagnostic engine (frenchCoach_sde) stays live for legacy UI (Progress,
// SessionStartScreen, AppContext skill profile) and as the sparse-evidence
// fallback read by projectEvidenceBeliefSnapshot. The COACH read model is the
// evidence-derived EvidenceBeliefSnapshot produced by beliefReducer from the
// EvidenceEvent log, rebuilt from that log alone.
//
// Phase 2 (i-am-building-an-cosmic-cascade.md, Resolved Decisions §2): the
// dual-write to diagnosticEngine.runAfterSession has been removed. Beliefs
// are rebuilt from L1/bridge evidence only; diagnosticEngine.SKILL_DEFS data
// is read-only fallback for skills with insufficient evidence, and stops
// receiving new observations through this path. diagnosticEngine itself is
// not deleted — only demoted.

import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import { getSkillProfile } from '../coaching/diagnosticEngine';
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
 * Rebuild and persist the coach's evidence-driven belief snapshot after a
 * completed answer. The orchestrator must append this attempt's evidence
 * BEFORE calling this so the snapshot reflects it.
 */
export function updateFromFeedback(): EvidenceBeliefSnapshot {
  return rebuildBeliefSnapshot();
}

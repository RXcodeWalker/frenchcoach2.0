// ── Coach MVP: session orchestrator ────────────────────────────────────────────
// Single entry point invoked after an answer is evaluated. It mirrors the exact
// side effects Learn used to run inline (persist, backend, XP, achievements,
// diagnostics) and ADDS the coach loop (evidence -> beliefs -> recommendation).
//
// It performs NO React dispatch. It returns everything the caller needs to update
// UI state, so the reducer stays pure and modes stay thin.

import { recordSession } from '../analytics/analyticsService';
import { awardXP, awardParticipationXP, checkAchievements, getProgressionState } from '../progression/progressionService';
import { isUnscored, LANGUAGE_SUCCESS_SCORE } from '../../domain/scoring';
import { recordReviewFailure } from './reviewPool';
import type { OrchestratorInput, OrchestratorResult, CoachRecommendation } from '../../types/coach';
import type { Question, FeedbackV2, AvoidanceSignal } from '../../types';
import type { EvidenceEvent } from '../../types/evidence';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import { buildEvidence } from './evidenceBuilder';
import { updateFromFeedback } from './beliefProjectionService';
import { generateRecommendation } from './recommendationEngine';
import { appendEvidenceEvents, getRecentEvidence } from './coachStorage';
import { syncProfileFromServices } from './coachProfileService';
import { invalidateDailyPlan } from './decisionEngine';
import { detectRecurringGrammarDrill, hasMicroDrillForSkill } from './recurringGrammar';
import { detectAndPersistProblem } from './interventionService';
import { buildAchievementContext } from './achievementContextBuilder';
import { projectSkillProfile } from './skillProfileProjection';
import { writeSkillProfile } from '../coaching/diagnosticEngine';

/**
 * B2: persist the evidence-derived skill profile (frenchCoach_sde).
 *
 * WRITE ORDER IS LOAD-BEARING (§2.3). Per attempt this module performs three
 * sequential localStorage writes: evidence log -> belief snapshot -> skill
 * profile. A single setItem is atomic per key, but the *sequence* is not
 * transactional, and no cross-key transaction is attempted. Recoverability
 * comes from invariant I9 instead: the evidence log is written FIRST and is
 * the source of truth, so an interruption after any write leaves the derived
 * caches stale but fully reconstructible (rebuildBeliefSnapshot() followed by
 * this call), never corrupt. Do not reorder these writes.
 */
function persistDerivedSkillProfile(snapshot: EvidenceBeliefSnapshot): void {
  writeSkillProfile(projectSkillProfile(snapshot));
}

/**
 * Process one completed answer. Order matters: diagnostics + evidence update the
 * learner model BEFORE the recommendation is generated, so the next session can
 * react to what just happened.
 */
export function orchestrateAttempt(input: OrchestratorInput): OrchestratorResult {
  const {
    session,
    question,
    feedback,
    avoidanceSignals,
    transcript,
    finalScore,
    streakDays,
    totalSessionsBefore,
    mode,
    topicsUsed = [],
  } = input;

  // 1. Capture evidence from this answer FIRST so beliefs + analytics summaries
  //    reflect the latest attempt.
  const evidenceEvents = buildEvidence({
    sessionId: session.id,
    question,
    feedback,
    avoidanceSignals,
    transcript,
    finalScore,
    mode,
    topicKey: session.topicKey ?? question?.topicKey,
    engine: feedback.engineMeta?.actualEngine,
  });
  const allEvidence = appendEvidenceEvents(evidenceEvents);

  // 2. Persist session locally (with a coaching summary + graph-resolved target
  //    skills). Cloud sync happens separately via sessionSync.ts, driven by
  //    AppContext once the session is committed to state.
  recordSession(session, { targetSkillIds: evidenceEvents[0]?.targetNodeIds });

  // 3. XP + level. The discriminant is feedback.unscored, never finalScore's
  // numeric value — a genuine graded 0 (a real bad answer) must still take the
  // scored path, so branching on "score === 0" would be wrong here.
  const unscored = isUnscored(feedback);
  const xpResult = unscored ? awardParticipationXP(streakDays) : awardXP(finalScore, streakDays);
  const { level } = getProgressionState();

  // 4. Rebuild the evidence-driven belief snapshot from the full evidence
  //    log, including the event just appended, then project it down into the
  //    legacy skill profile (evidence -> beliefs -> profile; see
  //    persistDerivedSkillProfile for why this order is load-bearing).
  const beliefSnapshot = updateFromFeedback();
  persistDerivedSkillProfile(beliefSnapshot);

  // 5. Achievements — evaluated after XP and beliefSnapshot are ready so all
  //    predicate contexts (xp thresholds, skill mastery) reflect this session.
  const newUnlockedAchievementIds = checkAchievements(
    buildAchievementContext({
      finalScore: unscored ? null : finalScore,
      streakDays,
      totalSessionsAfter: totalSessionsBefore + 1,
      topicsUsed,
      beliefSnapshot,
      examCompleted: false,
      examType: null,
    }),
  );

  // 6. Detect recurring-grammar problems and decide whether to offer a MicroDrill.
  const activeProblem = detectAndPersistProblem(allEvidence, beliefSnapshot);
  const drillSkillId =
    activeProblem && hasMicroDrillForSkill(activeProblem.nodeId)
      ? activeProblem.nodeId
      : detectRecurringGrammarDrill(allEvidence);

  // 7. Generate the next recommendation from the freshly updated model. If the
  //    problem above is unresolved, this forces a recovery recommendation.
  const recommendation = generateRecommendation(beliefSnapshot, getRecentEvidence(20));

  // 8. Keep CoachProfile in sync and bust the cached daily plan so the next
  //    visit to Home regenerates based on fresh evidence.
  syncProfileFromServices();
  invalidateDailyPlan();

  // 9. Best-effort: record a failure into the spaced-review pool. Never blocks
  //    the return — this store is derived, not authoritative.
  try {
    if (!unscored && finalScore < LANGUAGE_SUCCESS_SCORE && question && session.topicKey) {
      recordReviewFailure({ questionId: question.id, topicKey: session.topicKey, score: finalScore });
    }
  } catch {
    // A review-pool write failure must never break orchestrateAttempt's contract.
  }

  return {
    evidenceEvents,
    beliefSnapshot,
    recommendation,
    xpResult: {
      gain: xpResult.gain,
      totalXP: xpResult.totalXP,
      gemsGain: xpResult.gemsGain,
      totalGems: xpResult.totalGems,
      activeBoosters: xpResult.activeBoosters,
    },
    newUnlockedAchievementIds,
    newLevelName: level.name,
    drillSkillId,
    activeProblem,
  };
}

export interface ObserveAttemptInput {
  sessionId: string;
  question: Question | null;
  feedback: FeedbackV2;
  avoidanceSignals?: AvoidanceSignal[];
  transcript: string;
  finalScore: number;
  mode: 'practice' | 'exam' | 'story' | 'daily-news' | 'scenario-architect';
  topicKey?: string;
}

export interface ObserveAttemptResult {
  evidenceEvents: EvidenceEvent[];
  beliefSnapshot: EvidenceBeliefSnapshot;
  recommendation: CoachRecommendation;
}

/**
 * Lightweight coach hook for modes that own their own XP/session lifecycle (e.g.
 * Exam, which persists once at finish). It captures evidence, rebuilds beliefs,
 * and regenerates the recommendation WITHOUT awarding XP, persisting a
 * session, or checking achievements — so existing mode behavior is preserved.
 */
export function observeAttempt(input: ObserveAttemptInput): ObserveAttemptResult {
  const avoidanceSignals = input.avoidanceSignals ?? [];

  // Append evidence first so the rebuilt belief snapshot reflects this attempt.
  const evidenceEvents = buildEvidence({
    sessionId: input.sessionId,
    question: input.question,
    feedback: input.feedback,
    avoidanceSignals,
    transcript: input.transcript,
    finalScore: input.finalScore,
    mode: input.mode,
    topicKey: input.topicKey ?? input.question?.topicKey,
    engine: input.feedback.engineMeta?.actualEngine,
  });
  const allEvidence = appendEvidenceEvents(evidenceEvents);

  // Evidence -> beliefs -> profile; the ordering is load-bearing (§2.3).
  const beliefSnapshot = updateFromFeedback();
  persistDerivedSkillProfile(beliefSnapshot);
  detectAndPersistProblem(allEvidence, beliefSnapshot);

  const recommendation = generateRecommendation(beliefSnapshot, getRecentEvidence(20));

  syncProfileFromServices();
  invalidateDailyPlan();

  return { evidenceEvents, beliefSnapshot, recommendation };
}

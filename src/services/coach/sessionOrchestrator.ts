// ── Coach MVP: session orchestrator ────────────────────────────────────────────
// Single entry point invoked after an answer is evaluated. It mirrors the exact
// side effects Learn used to run inline (persist, backend, XP, achievements,
// diagnostics) and ADDS the coach loop (evidence -> beliefs -> recommendation).
//
// It performs NO React dispatch. It returns everything the caller needs to update
// UI state, so the reducer stays pure and modes stay thin.

import { recordSession } from '../analytics/analyticsService';
import { saveSessionToBackend } from '../api/apiClient';
import { awardXP, checkAchievements, getProgressionState } from '../progression/progressionService';
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
    topicsUsed,
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
  //    skills) + best-effort backend.
  recordSession(session, { targetSkillIds: evidenceEvents[0]?.targetNodeIds });
  saveSessionToBackend(session);

  // 3. XP + level (unchanged behavior).
  const xpResult = awardXP(finalScore, streakDays);
  const { level } = getProgressionState();

  // 4. Achievements (unchanged behavior).
  const newUnlockedAchievementIds = checkAchievements({
    score: finalScore,
    mode,
    totalSessions: totalSessionsBefore + 1,
    topicsUsed,
  });

  // 5. Drive diagnostics (legacy UI) + rebuild the evidence-driven belief
  //    snapshot from the full evidence log, including the event just appended.
  const beliefSnapshot = updateFromFeedback(feedback, avoidanceSignals);

  // 6. Detect and persist a recurring-grammar problem (intervention loop), and
  //    decide whether to offer a MicroDrill for it.
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
  mode: 'practice' | 'exam' | 'story';
  topicKey?: string;
}

export interface ObserveAttemptResult {
  evidenceEvents: EvidenceEvent[];
  beliefSnapshot: EvidenceBeliefSnapshot;
  recommendation: CoachRecommendation;
}

/**
 * Lightweight coach hook for modes that own their own XP/session lifecycle (e.g.
 * Exam, which persists once at finish). It updates diagnostics + beliefs, captures
 * evidence, and regenerates the recommendation WITHOUT awarding XP, persisting a
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

  const beliefSnapshot = updateFromFeedback(input.feedback, avoidanceSignals);
  detectAndPersistProblem(allEvidence, beliefSnapshot);

  const recommendation = generateRecommendation(beliefSnapshot, getRecentEvidence(20));

  syncProfileFromServices();
  invalidateDailyPlan();

  return { evidenceEvents, beliefSnapshot, recommendation };
}

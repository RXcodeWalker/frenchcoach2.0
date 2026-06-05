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
import type { CoachBeliefSnapshot } from '../../types/beliefs';
import { buildEvidence } from './evidenceBuilder';
import { updateFromFeedback } from './beliefProjectionService';
import { generateRecommendation } from './recommendationEngine';
import { appendEvidenceEvents, getRecentEvidence } from './coachStorage';
import { syncProfileFromServices } from './coachProfileService';
import { invalidateDailyPlan } from './decisionEngine';

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

  // 1. Persist session locally + best-effort backend (unchanged behavior).
  recordSession(session);
  saveSessionToBackend(session);

  // 2. XP + level (unchanged behavior).
  const xpResult = awardXP(finalScore, streakDays);
  const { level } = getProgressionState();

  // 3. Achievements (unchanged behavior).
  const newUnlockedAchievementIds = checkAchievements({
    score: finalScore,
    mode,
    totalSessions: totalSessionsBefore + 1,
    topicsUsed,
  });

  // 4. Drive diagnostics + project beliefs (replaces the old runAfterSession call).
  const beliefSnapshot = updateFromFeedback(feedback, avoidanceSignals);

  // 5. Capture evidence from this answer.
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
  appendEvidenceEvents(evidenceEvents);

  // 6. Generate the next recommendation from the freshly updated model.
  const recommendation = generateRecommendation(beliefSnapshot, getRecentEvidence(20));

  // 7. Keep CoachProfile in sync and bust the cached daily plan so the next
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
  beliefSnapshot: CoachBeliefSnapshot;
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

  const beliefSnapshot = updateFromFeedback(input.feedback, avoidanceSignals);

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
  appendEvidenceEvents(evidenceEvents);

  const recommendation = generateRecommendation(beliefSnapshot, getRecentEvidence(20));

  syncProfileFromServices();
  invalidateDailyPlan();

  return { evidenceEvents, beliefSnapshot, recommendation };
}

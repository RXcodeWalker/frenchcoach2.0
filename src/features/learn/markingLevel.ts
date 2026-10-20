// ── Learn marking level: flag gate and per-answer scoring (learn-marking §8). ────
//
// While `learnMarkingLevels` is not live, Learn sends no `marking` field (the
// backend stays on learn-prompt-v6), the dial is hidden, and every answer is
// shown and rewarded at Exam standard — whatever level is stored.

import { resolveFeatureStatus } from '../../config/featureFlags';
import { LANGUAGE_SUCCESS_SCORE, isUnscored } from '../../domain/scoring';
import { computeParticipationXPGain, computeXPGain } from '../../domain/xp';
import {
  DEFAULT_MARKING_LEVEL,
  resolveMarkedScore,
  type MarkedScore,
  type MarkingLevel,
} from '../../domain/learn/marking/markingLevel';
import type { FeedbackV2, SessionQuestion } from '../../types';

export function learnMarkingLevelsLive(): boolean {
  return resolveFeatureStatus('learnMarkingLevels') === 'live';
}

/** The level actually applied: the stored one while the flag is live, else Exam standard. */
export function effectiveMarkingLevel(stored: MarkingLevel, live: boolean): MarkingLevel {
  return live ? stored : DEFAULT_MARKING_LEVEL;
}

export interface LearnAttemptScore {
  /**
   * The Exam-standard score (`fb.scores.overall`), null when ungraded. The only
   * score Session.score, bestScore, evidence, SM-2 review, mastery and
   * mid-session adjust ever read (§8.1) — it never depends on the level.
   */
  examScore: number | null;
  /** What the learner sees and earns at their level (§8.2). */
  marked: MarkedScore;
  /** XP and gems for this answer (Learn's own copy of the award; the orchestrator's is authoritative). */
  xp: { gain: number; gemsGain: number };
  /** Passed to orchestrateAttempt; undefined when ungraded (it then awards participation XP). */
  reward?: { score: number; scoreCounts: boolean };
  /**
   * The answer streak: a counted score of 7+ extends it, a counted lower score
   * breaks it, and an ungraded answer or one marked below Exam standard
   * neither extends nor breaks it.
   */
  streak: 'extend' | 'break' | 'hold';
}

/** One graded Learn answer → the Exam-standard bookkeeping score and the marked display/reward score. */
export function scoreLearnAttempt(fb: FeedbackV2, level: MarkingLevel, streakDays: number): LearnAttemptScore {
  const marked = resolveMarkedScore(fb, level);
  if (isUnscored(fb) || marked.score === null) {
    return { examScore: null, marked, xp: computeParticipationXPGain(streakDays), streak: 'hold' };
  }
  const reward = { score: marked.score, scoreCounts: marked.earnsBonus };
  return {
    examScore: fb.scores.overall,
    marked,
    xp: computeXPGain(reward.score, streakDays, { scoreCounts: reward.scoreCounts }),
    reward,
    streak: !reward.scoreCounts ? 'hold' : reward.score >= LANGUAGE_SUCCESS_SCORE ? 'extend' : 'break',
  };
}

/**
 * The best score a learner is shown for a question (progress bar, mid-session
 * toast, session summary and its confetti): the marked one, else the Exam one.
 * Topic mastery and mid-session adjust keep reading `bestScore` (§8.1).
 */
export function shownBestScore(q: Pick<SessionQuestion, 'bestScore' | 'bestMarkedScore'>): number | null {
  return q.bestMarkedScore !== undefined ? q.bestMarkedScore : q.bestScore;
}

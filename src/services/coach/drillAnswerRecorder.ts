// ── Role-play drill: record one checked answer ─────────────────────────────────
// The drill checks answers offline (domain/rolePlayDrill/checkAnswer.ts), so
// there is no AI feedback to hand to orchestrateAttempt. This is the drill's own
// small entry point: it stores the Session, awards XP, checks achievements and
// keeps the coach's caches fresh — and deliberately writes NO evidence event and
// no belief update, because nothing here read the learner's French the way a
// marked Learn answer does. Never route a drill answer through orchestrateAttempt.
//
// XP (owner brief, role-play drill rebuild): `computeXPGain` at full credit when
// every part of the task was communicated, `computeParticipationXPGain`
// otherwise, with no gems. `Session.score` is null — the drill shows and stores no mark.

import { recordSession } from '../analytics/analyticsService';
import { awardXP, awardParticipationXP, checkAchievements, getProgressionState } from '../progression/progressionService';
import { computeXPGain, computeParticipationXPGain } from '../../domain/xp';
import { drillSessionId } from '../../features/rolePlayDrill/drillProgress';
import { buildAchievementContext } from './achievementContextBuilder';
import { syncProfileFromServices } from './coachProfileService';
import { invalidateDailyPlan } from './decisionEngine';
import type { Session } from '../../types';

/** The score `computeXPGain` is asked for when every part was covered: full credit. */
export const DRILL_FULL_CREDIT_SCORE = 10;

/** The XP a checked drill answer is worth. Pure. The drill earns XP only — never gems (owner, 2026-11-23). */
export function drillXpGain(complete: boolean, streakDays: number): { gain: number; gemsGain: number } {
  return complete ? computeXPGain(DRILL_FULL_CREDIT_SCORE, streakDays) : computeParticipationXPGain(streakDays);
}

export interface DrillAnswerInput {
  cardId: string;
  /** 0-based task index; part of the session id (`story-<cardId>-<ts>-<step>`). */
  step: number;
  /** The examiner's question, as spoken. */
  questionText: string;
  transcript: string;
  durationSec: number;
  /** Every part of the task was communicated. */
  complete: boolean;
  streakDays: number;
  totalSessionsBefore: number;
  /** Homework this answer belongs to (features/homework), already confirmed by my_assignments(). */
  assignmentId?: string;
  now?: number;
}

export interface DrillAnswerResult {
  session: Session;
  xpResult: { gain: number; totalXP: number; gemsGain: number; totalGems: number; activeBoosters: { id: string; expiresAt: string; multiplier: number }[] };
  newUnlockedAchievementIds: string[];
  newLevelName: string;
}

export function recordDrillAnswer(input: DrillAnswerInput): DrillAnswerResult {
  const now = input.now ?? Date.now();
  const wordCount = input.transcript.split(/\s+/).filter(Boolean).length;

  const session: Session = {
    id: drillSessionId(input.cardId, input.step, now),
    mode: 'story',
    questionText: input.questionText,
    transcript: input.transcript,
    wordCount,
    score: null,
    xpEarned: drillXpGain(input.complete, input.streakDays).gain,
    durationSec: input.durationSec,
    createdAt: new Date(now).toISOString(),
    ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
  };

  recordSession(session);

  const xpSource = 'story' as const;
  const xp = input.complete
    ? awardXP(DRILL_FULL_CREDIT_SCORE, input.streakDays, xpSource, { noGems: true })
    : awardParticipationXP(input.streakDays, xpSource, { noGems: true });
  const { level } = getProgressionState();

  // A drill answer carries no marked score, so no score achievement can fire.
  const newUnlockedAchievementIds = checkAchievements(
    buildAchievementContext({
      finalScore: null,
      streakDays: input.streakDays,
      totalSessionsAfter: input.totalSessionsBefore + 1,
      topicsUsed: [],
      beliefSnapshot: null,
      examCompleted: false,
      examType: null,
    }),
  );

  syncProfileFromServices();
  invalidateDailyPlan();

  return {
    session,
    xpResult: {
      gain: xp.gain,
      totalXP: xp.totalXP,
      gemsGain: xp.gemsGain,
      totalGems: xp.totalGems,
      activeBoosters: xp.activeBoosters,
    },
    newUnlockedAchievementIds,
    newLevelName: level.name,
  };
}

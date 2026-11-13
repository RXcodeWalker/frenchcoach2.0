// @vitest-environment jsdom
// ── "Easier" never shows a question above today's level — no exceptions. ───────
// Regression (owner report, 2026-11-13): starting level A1, aim "Easier", and the
// session still had A2 questions. Three ways a harder question got in:
//   1. ladder rung 5 — a topic with few A1 questions (future has 3, shopping 1)
//      filled the rest of a longer session with "the easiest question left", A2;
//   2. the review slot — a due spaced-review question was never level-checked,
//      so an A2 question answered on another day came back in an Easier session;
//   3. a mid-session "ease" could replace a question with a *harder* one when
//      nothing fitted the eased band (rung 5 again).
// "Easier" now holds every pick, every slot, every rung to the displayed level of
// today's target; a topic that runs out gives a shorter session instead.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSessionQuestions, SESSION_TARGET } from '../sessionBuilder';
import { deriveDemandScore, demandScoreToLevel } from '../../domain/learn/demand/deriveDemandLevel';
import { computeSessionTarget, type Aim } from '../../domain/learn/selection/sessionTarget';
import { COLD_START_SEED } from '../../domain/learn/ability/thresholds';
import { midSessionAdjust } from '../../domain/learn/selection/midSessionAdjust';
import { TOPICS, getTopicQuestions } from '../../data/questions';
import { recordReviewOutcome } from '../../services/coach/reviewPool';
import { STORAGE_KEYS, storageSet } from '../../services/persistence/storage';
import type { ActiveSession, DifficultyTier, SessionMode, SkillProfile } from '../../types';
import { makeSessionQuestion } from '../sessionBuilder';

const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3 } as const;
const TIERS: DifficultyTier[] = ['beginner', 'intermediate', 'advanced'];
const MODES: { mode: SessionMode; count: number }[] = [
  { mode: 'single', count: 1 },
  { mode: 'quick', count: 3 },
  { mode: 'quick', count: SESSION_TARGET.quick },
  { mode: 'standard', count: SESSION_TARGET.standard },
];
const topics = TOPICS.filter((t) => t.questionsCount >= 5).map((t) => t.key);
const ONE_DAY_MS = 86_400_000;

function build(topic: string, tier: DifficultyTier, aim: Aim, mode: SessionMode, count: number) {
  return buildSessionQuestions(topic, mode, {} as SkillProfile, null, tier, null, null, { aim, migratedTier: tier, count });
}

function levelOf(score: number) {
  return LEVEL_RANK[demandScoreToLevel(score)];
}

beforeEach(() => {
  localStorage.clear();
  storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: 'live', learnSpacedReview: 'live' });
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// Walks the whole bank many times: give it room on a loaded CI runner.
describe('"Easier" never shows a question above today\'s level', { timeout: 30_000 }, () => {
  it('every topic, tier and session length — no rung excuses', () => {
    for (const topic of topics) for (const tier of TIERS) for (const { mode, count } of MODES) {
      const todays = levelOf(computeSessionTarget(COLD_START_SEED[tier], 'comfortable'));
      const built = build(topic, tier, 'comfortable', mode, count);
      expect(built.questions.length, `${topic}/${tier}/${count}: empty session`).toBeGreaterThan(0);
      for (const q of built.questions) {
        expect(q.demands, `${topic}/${tier}/${count}: ${q.id} has no level`).toBeTruthy();
        expect(levelOf(deriveDemandScore(q.demands!)), `${topic}/${tier}/${count}: ${q.id}`).toBeLessThanOrEqual(todays);
      }
    }
  });

  it('a due review question above today\'s level is skipped, not shown', () => {
    for (const topic of topics) {
      localStorage.clear();
      storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: 'live', learnSpacedReview: 'live' });
      vi.restoreAllMocks();
      // Every A2-or-harder question in the topic is due for review.
      const harder = getTopicQuestions(topic).filter((q) => q.demands && levelOf(deriveDemandScore(q.demands)) > 0);
      for (const q of harder) recordReviewOutcome({ questionId: q.id, topicKey: topic, score: 4 });
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + ONE_DAY_MS + 1000);

      const built = build(topic, 'beginner', 'comfortable', 'standard', SESSION_TARGET.standard);
      for (const q of built.questions) {
        expect(demandScoreToLevel(deriveDemandScore(q.demands!)), `${topic}: ${q.id}`).toBe('A1');
      }
    }
  });

  it('a mid-session ease never brings in a harder question', () => {
    for (const topic of topics) {
      const built = build(topic, 'beginner', 'comfortable', 'standard', SESSION_TARGET.standard);
      if (built.questions.length < 4) continue;
      const questions = built.questions.map((q, i) => makeSessionQuestion(q, false, built.slots![i]));
      // Two weak answers -> 'ease'.
      for (const i of [0, 1]) Object.assign(questions[i], { status: 'completed', bestScore: 2 });
      const session = { questions, currentIndex: 2, aim: 'comfortable' } as unknown as ActiveSession;
      const result = midSessionAdjust({
        session, pool: getTopicQuestions(topic), seenIds: new Set(), focusSkillIds: [],
        activeDemandProblem: null, beliefSnapshot: null, alreadyAdjustedThisSession: false,
      });
      result.session.questions.forEach((sq, i) => {
        const before = deriveDemandScore(session.questions[i].question.demands!);
        const after = deriveDemandScore(sq.question.demands!);
        expect(after, `${topic}: slot ${i} ${sq.question.id}`).toBeLessThanOrEqual(before);
        expect(demandScoreToLevel(after), `${topic}: ${sq.question.id}`).toBe('A1');
      });
    }
  });
});

// @vitest-environment jsdom
// ── Learn overhaul Batch 1b — the spaced-review slot excludes only this
// session's picks, never the learner's historical seen set ──────────────────
// Every review item was answered before, and endSession adds every answered
// id to topicMastery.uniqueQuestionsAnswered — so passing `seen ∪ chosen` to
// getEligibleReviewQuestion excluded every due item and review never fired.
// The older suites passed topicMastery = null, which hid this; these tests
// use a realistic topicMastery whose seen set contains the due item.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSessionQuestions, makeSessionQuestion, SESSION_TARGET } from '../sessionBuilder';
import { recordReviewOutcome } from '../../services/coach/reviewPool';
import { STORAGE_KEYS, storageSet } from '../../services/persistence/storage';
import { midSessionAdjust } from '../../domain/learn/selection/midSessionAdjust';
import { getTopicQuestions } from '../../data/gameData';
import type { ActiveSession, SkillProfile, TopicMasteryEntry } from '../../types';

const EMPTY_SKILL_PROFILE = {} as SkillProfile;
const ONE_DAY_MS = 86_400_000;
const DUE_ID = 'sch_11';

function realisticMastery(answered: string[]): TopicMasteryEntry {
  return {
    topicKey: 'school',
    sessionsCompleted: 3,
    scoredSessionsCompleted: 3,
    uniqueQuestionsAnswered: answered,
    averageScore: 6.2,
    lastSessionAt: new Date().toISOString(),
    mastered: false,
  };
}

function makeDue(questionId: string) {
  recordReviewOutcome({ questionId, topicKey: 'school', score: 4 });
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + ONE_DAY_MS + 1000);
}

function setAdaptive(status: 'live' | 'coming-soon') {
  storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: status });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe.each(['live', 'coming-soon'] as const)('review slot with a realistic topicMastery (adaptive flag %s)', (flag) => {
  beforeEach(() => setAdaptive(flag));

  it('a due item the learner answered before is still offered', () => {
    makeDue(DUE_ID);
    const mastery = realisticMastery([DUE_ID, 'sch_01', 'sch_02']);
    const { questions, reviewQuestionId } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, mastery);
    expect(reviewQuestionId).toBe(DUE_ID);
    expect(questions.filter((q) => q.id === DUE_ID)).toHaveLength(1);
  });

  it('the review item is never duplicated in a session', () => {
    makeDue(DUE_ID);
    const mastery = realisticMastery(getTopicQuestions('school').map((q) => q.id));
    const { questions } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, mastery);
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === DUE_ID)).toHaveLength(1);
  });
});

describe('midSessionAdjust never replaces the review item (adaptive path)', () => {
  beforeEach(() => setAdaptive('live'));

  it('an ease adjustment leaves the review question in place', () => {
    makeDue(DUE_ID);
    const mastery = realisticMastery([DUE_ID]);
    const built = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, mastery);
    expect(built.reviewQuestionId).toBe(DUE_ID);
    const slotById = new Map((built.slots ?? []).map((s) => [s.questionId, s]));
    const sessionQuestions = built.questions.map((q) => makeSessionQuestion(q, q.id === built.reviewQuestionId, slotById.get(q.id)));
    // Two low scores on the first two questions trigger an ease (docs §8.4).
    for (const i of [0, 1]) {
      sessionQuestions[i] = { ...sessionQuestions[i], status: 'completed', bestScore: 3 };
    }
    const reviewIndex = sessionQuestions.findIndex((sq) => sq.isReview);
    expect(reviewIndex).toBeGreaterThanOrEqual(0);

    const session = {
      id: 's', topicKey: 'school', mode: 'standard', targetCount: sessionQuestions.length,
      questions: sessionQuestions, currentIndex: 2, questionsCompleted: 2, answerStreak: 0, bestStreak: 0,
      xpAccumulated: 0, gemsAccumulated: 0, totalWords: 0, startedAt: new Date().toISOString(), skillSnapshot: {},
    } as unknown as ActiveSession;

    const result = midSessionAdjust({
      session,
      pool: getTopicQuestions('school'),
      seenIds: new Set(mastery.uniqueQuestionsAnswered),
      focusSkillIds: [],
      activeDemandProblem: null,
      beliefSnapshot: null,
      alreadyAdjustedThisSession: false,
    });
    const after = result.session.questions[reviewIndex];
    if (reviewIndex > session.currentIndex) {
      expect(after.question.id).toBe(DUE_ID);
      expect(after.isReview).toBe(true);
    }
    expect(result.session.questions.filter((sq) => sq.question.id === DUE_ID)).toHaveLength(1);
    expect(result.session.questions).toHaveLength(Math.min(SESSION_TARGET.standard, built.questions.length));
  });
});

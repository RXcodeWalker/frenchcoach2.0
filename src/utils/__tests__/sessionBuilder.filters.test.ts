// @vitest-environment jsdom
// ── Learn overhaul Batch 2 — learner filters apply to ONE pool, used by slotting,
// the review slot and mid-session adjust ───────────────────────────────────────
// Filters narrow the pool before slotting; a session with fewer matches than
// requested returns fewer questions, never padded with non-matching ones.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSessionQuestions, makeSessionQuestion, topicPool } from '../sessionBuilder';
import { recordReviewOutcome } from '../../services/coach/reviewPool';
import { STORAGE_KEYS, storageSet } from '../../services/persistence/storage';
import { midSessionAdjust } from '../../domain/learn/selection/midSessionAdjust';
import { filterPool, matchesFilters, type GrammarFocus, type LearnFilters } from '../../domain/learn/selection/filters';
import { getTopicQuestions } from '../../data/gameData';
import { TOPICS } from '../../data/questions';
import type { ActiveSession, Question, SkillProfile, TopicMasteryEntry } from '../../types';

const EMPTY_SKILL_PROFILE = {} as SkillProfile;
const ONE_DAY_MS = 86_400_000;
const PAST: LearnFilters = { grammar: 'past' };
const TOPIC = 'hobbies';
// A 'standard' session plans 10 slots, 3 of them review; with nothing due those 3
// stay empty, so at most 7 questions can come back. The "fewer matches than
// requested" tests need a core topic + focus with 1–6 matches, and the "zero
// matches" test one with none. Pick both from the bank so ordinary content
// edits (new questions, re-tagged time frames) can't break them.
const CORE_TOPICS = TOPICS.filter((t) => !t.isAdvanced).map((t) => t.key);
const FOCI: GrammarFocus[] = ['future', 'past', 'present', 'opinion'];
function findTopicAndFilter(accept: (matches: number) => boolean): { topic: string; filters: LearnFilters } {
  for (const topic of CORE_TOPICS) {
    for (const grammar of FOCI) {
      const filters: LearnFilters = { grammar };
      if (accept(filterPool(getTopicQuestions(topic), filters).length)) return { topic, filters };
    }
  }
  throw new Error('no core topic + focus in the bank fits this test');
}
const FEW = findTopicAndFilter((n) => n >= 1 && n <= 6);
const NONE = findTopicAndFilter((n) => n === 0);

function mastery(answered: string[], topicKey: string = TOPIC): TopicMasteryEntry {
  return {
    topicKey,
    sessionsCompleted: 3,
    scoredSessionsCompleted: 3,
    uniqueQuestionsAnswered: answered,
    averageScore: 6.2,
    lastSessionAt: new Date().toISOString(),
    mastered: false,
  };
}

function setAdaptive(status: 'live' | 'coming-soon') {
  storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: status });
}

function makeDue(questionId: string) {
  recordReviewOutcome({ questionId, topicKey: TOPIC, score: 4 });
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + ONE_DAY_MS + 1000);
}

const pastIds = () => filterPool(getTopicQuestions(TOPIC), PAST).map((q) => q.id);
const nonPast = () => getTopicQuestions(TOPIC).filter((q) => !matchesFilters(q, PAST));

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  setAdaptive('live');
});
afterEach(() => localStorage.clear());

describe('filters narrow the pool before slotting', () => {
  it('every selected question matches the filter', () => {
    const { questions } = buildSessionQuestions(TOPIC, 'quick', EMPTY_SKILL_PROFILE, null, undefined, null, null, { filters: PAST });
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) expect(matchesFilters(q, PAST)).toBe(true);
  });

  it('fewer matches than requested returns exactly the matches, never padded with non-matching questions', () => {
    const matches = filterPool(getTopicQuestions(FEW.topic), FEW.filters).map((q) => q.id);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(7);
    const { questions, slots } = buildSessionQuestions(FEW.topic, 'standard', EMPTY_SKILL_PROFILE, null, undefined, null, null, { filters: FEW.filters });
    expect(questions.map((q) => q.id).sort()).toEqual([...matches].sort());
    expect(slots).toHaveLength(questions.length);
  });

  it('seen matching questions are still reused (the ladder never reaches outside the filtered pool)', () => {
    const matches = filterPool(getTopicQuestions(FEW.topic), FEW.filters).map((q) => q.id);
    const { questions } = buildSessionQuestions(FEW.topic, 'standard', EMPTY_SKILL_PROFILE, mastery(matches, FEW.topic), undefined, null, null, { filters: FEW.filters });
    expect(questions.map((q) => q.id).sort()).toEqual([...matches].sort());
  });

  it('zero matches yields an empty session, not an unfiltered one', () => {
    const { questions } = buildSessionQuestions(NONE.topic, 'quick', EMPTY_SKILL_PROFILE, null, undefined, null, null, { filters: NONE.filters });
    expect(questions).toHaveLength(0);
  });

  it('no filter leaves the unfiltered behaviour untouched', () => {
    const a = buildSessionQuestions(TOPIC, 'quick', EMPTY_SKILL_PROFILE, null);
    const b = buildSessionQuestions(TOPIC, 'quick', EMPTY_SKILL_PROFILE, null, undefined, null, null, { filters: { grammar: null } });
    expect(b.questions.map((q) => q.id)).toEqual(a.questions.map((q) => q.id));
  });
});

describe('topicPool', () => {
  it('is the filtered pool: only matches, and the whole topic when no filter is active', () => {
    expect(topicPool(TOPIC, PAST).map((q) => q.id).sort()).toEqual([...pastIds()].sort());
    expect(topicPool(TOPIC)).toHaveLength(getTopicQuestions(TOPIC).length);
  });
});

describe('the review slot respects the filter', () => {
  it('a due item that does not match is not offered (the slot stays empty)', () => {
    const dueId = nonPast()[0].id;
    makeDue(dueId);
    const { questions, reviewQuestionId } = buildSessionQuestions(
      TOPIC, 'standard', EMPTY_SKILL_PROFILE, mastery([dueId]), undefined, null, null, { filters: PAST },
    );
    expect(reviewQuestionId).toBeNull();
    expect(questions.some((q) => q.id === dueId)).toBe(false);
  });

  it('a due item that matches is still offered', () => {
    const dueId = pastIds()[0];
    makeDue(dueId);
    const { questions, reviewQuestionId } = buildSessionQuestions(
      TOPIC, 'standard', EMPTY_SKILL_PROFILE, mastery([dueId]), undefined, null, null, { filters: PAST },
    );
    expect(reviewQuestionId).toBe(dueId);
    expect(questions.filter((q) => q.id === dueId)).toHaveLength(1);
  });

  it('holds on the legacy path too: filters are ignored there (the UI hides them)', () => {
    setAdaptive('coming-soon');
    const { questions } = buildSessionQuestions(TOPIC, 'quick', EMPTY_SKILL_PROFILE, null, undefined, null, null, { filters: PAST });
    expect(questions.length).toBe(5);
  });
});

describe('midSessionAdjust with the filtered pool never inserts a non-match', () => {
  function sessionFrom(filters: LearnFilters): { session: ActiveSession; pool: Question[] } {
    const built = buildSessionQuestions(TOPIC, 'standard', EMPTY_SKILL_PROFILE, null, undefined, null, null, { filters });
    const slotById = new Map((built.slots ?? []).map((s) => [s.questionId, s]));
    const sqs = built.questions.map((q) => makeSessionQuestion(q, q.id === built.reviewQuestionId, slotById.get(q.id)));
    for (const i of [0, 1]) sqs[i] = { ...sqs[i], status: 'completed', bestScore: 3 };
    const session = {
      id: 's', topicKey: TOPIC, mode: 'standard', targetCount: sqs.length,
      questions: sqs, currentIndex: 2, questionsCompleted: 2, answerStreak: 0, bestStreak: 0,
      xpAccumulated: 0, gemsAccumulated: 0, totalWords: 0, startedAt: new Date().toISOString(), skillSnapshot: {},
    } as unknown as ActiveSession;
    return { session, pool: topicPool(TOPIC, filters) };
  }

  it('an ease adjustment drawing on the filtered pool keeps every question a match', () => {
    const { session, pool } = sessionFrom(PAST);
    const result = midSessionAdjust({
      session, pool, seenIds: new Set(), focusSkillIds: [], activeDemandProblem: null,
      beliefSnapshot: null, alreadyAdjustedThisSession: false,
    });
    for (const sq of result.session.questions) expect(matchesFilters(sq.question, PAST)).toBe(true);
    expect(result.session.questions).toHaveLength(session.questions.length);
  });
});

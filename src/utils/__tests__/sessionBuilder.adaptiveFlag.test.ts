// @vitest-environment jsdom
// ── Stage 6 — buildSessionQuestions dispatcher, learnAdaptiveDifficulty flag ───
// Confirms the flag actually switches code paths and that the review pool
// still integrates correctly through the new selector when the flag is on.
// sessionBuilder.reviewPool.test.ts covers the flag-off (legacy) path and is
// left unmodified per docs §16 Stage 6 acceptance criterion.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSessionQuestions, SESSION_TARGET } from '../sessionBuilder';
import { recordReviewFailure, advanceReviewPoolSessions, REVIEW_MIN_INTERVAL_MS } from '../../services/coach/reviewPool';
import { STORAGE_KEYS, storageSet } from '../../services/persistence/storage';
import type { SkillProfile } from '../../types';

const EMPTY_SKILL_PROFILE = {} as SkillProfile;

function enableAdaptiveFlag() {
  storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: 'live' });
}

function disableAdaptiveFlag() {
  storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: 'coming-soon' });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// docs §16 Stage 10 flipped the compile-time default to 'live' — this suite
// must not rely on that default (it would silently stop testing the legacy
// path the moment the default changes again). Each describe block sets its
// own explicit override.
describe('buildSessionQuestions with learnAdaptiveDifficulty off', () => {
  beforeEach(() => {
    disableAdaptiveFlag();
  });

  it('uses the legacy path — returns SESSION_TARGET.quick questions', () => {
    const { questions } = buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(questions.length).toBeLessThanOrEqual(SESSION_TARGET.quick);
    expect(questions.length).toBeGreaterThan(0);
  });
});

describe('buildSessionQuestions with learnAdaptiveDifficulty live', () => {
  beforeEach(() => {
    enableAdaptiveFlag();
  });

  it('never throws for a fresh (cold-start) learner and returns some questions', () => {
    expect(() => buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null)).not.toThrow();
    const { questions } = buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(SESSION_TARGET.quick);
  });

  it('never duplicates a question within one session', () => {
    const { questions } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null);
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the review pool still integrates: an eligible review question is selected and flagged', () => {
    recordReviewFailure({ questionId: 'sch_11', topicKey: 'school' });
    advanceReviewPoolSessions();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + REVIEW_MIN_INTERVAL_MS + 1000);

    const { questions, reviewQuestionId } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null);
    expect(reviewQuestionId).toBe('sch_11');
    expect(questions.some((q) => q.id === 'sch_11')).toBe(true);
  });

  it('single mode (target=1) returns at most one question', () => {
    const { questions } = buildSessionQuestions('school', 'single', EMPTY_SKILL_PROFILE, null);
    expect(questions.length).toBeLessThanOrEqual(1);
  });
});

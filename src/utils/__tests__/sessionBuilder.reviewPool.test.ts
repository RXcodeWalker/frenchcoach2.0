// @vitest-environment jsdom
// ── Phase 3 Slice E: buildSessionQuestions ↔ review-pool integration ───────────
// Confirms the review-slot splice (sessionBuilder.ts, after `return selected`)
// never touches applyDifficultyDistribution's internal math — it's a post-hoc
// replacement of the last selected question, verified at various targets
// including the target=1/single edge Phase 1 established a precedent for.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildSessionQuestions, SESSION_TARGET } from '../sessionBuilder';
import { recordReviewFailure, advanceReviewPoolSessions, REVIEW_MIN_INTERVAL_MS } from '../../services/coach/reviewPool';
import type { SkillProfile } from '../../types';

const EMPTY_SKILL_PROFILE = {} as SkillProfile;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function makeReviewQuestionEligible(questionId: string, topicKey: string) {
  recordReviewFailure({ questionId, topicKey });
  advanceReviewPoolSessions();
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + REVIEW_MIN_INTERVAL_MS + 1000);
}

describe('buildSessionQuestions review-slot integration', () => {
  // sch_11 sorts well outside the natural top-10 pick (difficulty-2, far down
  // the file), so it's a genuine "not otherwise selected" review candidate —
  // unlike sch_01 (difficulty-1, first in file), which the distribution
  // algorithm would already have picked, making a splice-vs-natural-pick
  // distinction untestable.
  const REVIEW_CANDIDATE_ID = 'sch_11';

  it('quick mode (target=5, >=4) reserves the last slot for an eligible review question', () => {
    makeReviewQuestionEligible(REVIEW_CANDIDATE_ID, 'school');
    const { questions } = buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(questions).toHaveLength(SESSION_TARGET.quick);
    expect(questions[questions.length - 1].id).toBe(REVIEW_CANDIDATE_ID);
  });

  it('single mode (target=1, <4) never reserves a slot regardless of pool state', () => {
    makeReviewQuestionEligible(REVIEW_CANDIDATE_ID, 'school');
    const { questions } = buildSessionQuestions('school', 'single', EMPTY_SKILL_PROFILE, null);
    expect(questions).toHaveLength(SESSION_TARGET.single);
    // The review candidate must not have forcibly displaced the normal pick
    // in a 1-question session — target < 4 gate means no splice happens at all.
    expect(questions[0].id).not.toBe(REVIEW_CANDIDATE_ID);
  });

  it('standard mode (target=10) still reserves only the last slot, not multiple', () => {
    makeReviewQuestionEligible(REVIEW_CANDIDATE_ID, 'school');
    const { questions } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null);
    expect(questions).toHaveLength(SESSION_TARGET.standard);
    expect(questions[questions.length - 1].id).toBe(REVIEW_CANDIDATE_ID);
    // Every other slot is untouched by the review splice — no duplicate elsewhere.
    const occurrences = questions.filter(q => q.id === REVIEW_CANDIDATE_ID).length;
    expect(occurrences).toBe(1);
  });

  it('a review candidate already naturally selected is never duplicated by the splice', () => {
    // sch_01 (difficulty-1, first in file) IS naturally picked by the
    // distribution algorithm for a 10-question session — the splice must
    // detect this and decline to insert a second copy, falling back to the
    // distribution's own natural last-slot pick instead.
    makeReviewQuestionEligible('sch_01', 'school');
    const { questions } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null);
    const occurrences = questions.filter(q => q.id === 'sch_01').length;
    expect(occurrences).toBe(1);
  });

  it('no eligible review question → last slot is chosen normally (no splice, no crash)', () => {
    const { questions } = buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(questions).toHaveLength(SESSION_TARGET.quick);
  });

  it('a different topic\'s review pool entry never leaks into this session', () => {
    makeReviewQuestionEligible(REVIEW_CANDIDATE_ID, 'school');
    const { questions } = buildSessionQuestions('hobbies', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(questions.some(q => q.id === REVIEW_CANDIDATE_ID)).toBe(false);
  });

  it('the review candidate is marked isReview: true, and reviewQuestionId matches it', () => {
    makeReviewQuestionEligible(REVIEW_CANDIDATE_ID, 'school');
    const { questions, reviewQuestionId } = buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(reviewQuestionId).toBe(REVIEW_CANDIDATE_ID);
    expect(questions[questions.length - 1].id).toBe(reviewQuestionId);
  });

  it('reviewQuestionId is null when no splice happens', () => {
    const { reviewQuestionId } = buildSessionQuestions('school', 'quick', EMPTY_SKILL_PROFILE, null);
    expect(reviewQuestionId).toBeNull();
  });
});

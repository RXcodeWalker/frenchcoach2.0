// @vitest-environment jsdom
// ── Stage 6 — buildSessionQuestions dispatcher, learnAdaptiveDifficulty flag ───
// Confirms the flag actually switches code paths and that the review pool
// still integrates correctly through the new selector when the flag is on.
// sessionBuilder.reviewPool.test.ts covers the flag-off (legacy) path and is
// left unmodified per docs §16 Stage 6 acceptance criterion.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSessionQuestions, sessionAbility, SESSION_TARGET } from '../sessionBuilder';
import { recordReviewOutcome } from '../../services/coach/reviewPool';

const ONE_DAY_MS = 86_400_000;
import { STORAGE_KEYS, scopedKey, storageSet } from '../../services/persistence/storage';
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
    recordReviewOutcome({ questionId: 'sch_11', topicKey: 'school', score: 4 });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + ONE_DAY_MS + 1000);

    const { questions, reviewQuestionId } = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null);
    expect(reviewQuestionId).toBe('sch_11');
    expect(questions.some((q) => q.id === 'sch_11')).toBe(true);
  });

  it('single mode (target=1) returns at most one question', () => {
    const { questions } = buildSessionQuestions('school', 'single', EMPTY_SKILL_PROFILE, null);
    expect(questions.length).toBeLessThanOrEqual(1);
  });
});

// ── Learn overhaul Batch 1a — Today's aim and the stored tier reach selection ─
// Before the fix the adaptive path recomputed aim from a JSON-parsed read of a
// key SET_DIFFICULTY writes raw, so it always fell back to 'balanced' and the
// 4.5 default seed whatever the learner chose.
describe('buildSessionQuestions honours aim and the stored tier (adaptive path)', () => {
  beforeEach(() => {
    enableAdaptiveFlag();
  });

  function targetBand(result: ReturnType<typeof buildSessionQuestions>) {
    const slot = result.slots?.find((s) => s.slotType === 'target');
    expect(slot).toBeDefined();
    return slot!.slotBand;
  }

  it('push and comfortable produce different session targets (bands)', () => {
    const push = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null, 'intermediate', null, null, { aim: 'push', migratedTier: 'intermediate' });
    const comfortable = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null, 'intermediate', null, null, { aim: 'comfortable', migratedTier: 'intermediate' });
    // Cold start seed 4.5: push -> T=5.5, comfortable -> T=3.5.
    expect(targetBand(push)).toEqual({ lo: 5.0, hi: 6.0 });
    expect(targetBand(comfortable)).toEqual({ lo: 3.0, hi: 4.0 });
  });

  it('the stored tier, written raw by SET_DIFFICULTY, still seeds cold start', () => {
    // Exactly what AppContext's SET_DIFFICULTY writes: a raw string, not JSON.
    localStorage.setItem(scopedKey(STORAGE_KEYS.difficulty), 'beginner');
    const beginner = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null, 'beginner', null, null, { aim: 'balanced', migratedTier: 'beginner' });
    const expert = buildSessionQuestions('school', 'standard', EMPTY_SKILL_PROFILE, null, 'expert', null, null, { aim: 'balanced', migratedTier: 'expert' });
    expect(targetBand(beginner)).toEqual({ lo: 2.0, hi: 3.0 });
    expect(targetBand(expert)).toEqual({ lo: 7.5, hi: 8.5 });
  });

  it('sessionAbility (what the setup screen shows) uses the same seed as selection', () => {
    expect(sessionAbility('beginner').abilityScore).toBe(2.5);
    expect(sessionAbility('expert').abilityScore).toBe(8.0);
    expect(sessionAbility(undefined).abilityScore).toBe(4.5);
  });
});

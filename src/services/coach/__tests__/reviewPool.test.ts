// @vitest-environment jsdom
// ── Phase 4.2: real SM-2 spaced-repetition review pool ──────────────────────────
// getEligibleReviewQuestion/recordReviewOutcome are storage-backed (localStorage,
// jsdom env), so these test against real localStorage, following
// persistenceRoundTrip.test.ts's precedent.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Question } from '../../../types';

vi.mock('../../../data/gameData', () => ({
  getQuestionById: (id: string): Question | undefined => FIXTURE_QUESTIONS.find(q => q.id === id),
}));

const FIXTURE_QUESTIONS: Question[] = [
  { id: 'q-school-1', topicKey: 'school', text: 'Q1?', hint: '', difficulty: 1, followUps: [], modelAnswer: '', keyVocab: [] },
  { id: 'q-school-2', topicKey: 'school', text: 'Q2?', hint: '', difficulty: 1, followUps: [], modelAnswer: '', keyVocab: [] },
  { id: 'q-hobbies-1', topicKey: 'hobbies', text: 'Q3?', hint: '', difficulty: 1, followUps: [], modelAnswer: '', keyVocab: [] },
];

const ONE_DAY_MS = 86_400_000;

import { STORAGE_KEYS } from '../../persistence/storage';
import {
  getEligibleReviewQuestion,
  recordReviewOutcome,
  getReviewItemFirstRecordedScore,
} from '../reviewPool';

beforeEach(() => {
  localStorage.clear();
});

function readStoredItem(questionId: string) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.reviewPool)!);
  return stored.items[questionId];
}

function advanceDays(days: number) {
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + days * ONE_DAY_MS + 1000);
}

describe('getEligibleReviewQuestion — fallback rules', () => {
  it('1. empty pool → null (unseen case, nothing recorded yet)', () => {
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('2. one due item → returns it', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 });
    advanceDays(1);
    const result = getEligibleReviewQuestion('school', new Set());
    expect(result?.id).toBe('q-school-1');
    vi.restoreAllMocks();
  });

  it('3. interval not elapsed → treated as empty', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 });
    // No time advance — the 1-day interval has not elapsed.
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('4. topic-scoped — a different topic never surfaces the item', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 });
    advanceDays(1);
    expect(getEligibleReviewQuestion('hobbies', new Set())).toBeNull();
    vi.restoreAllMocks();
  });

  it('5. ExamMode-excluded: this module is never imported by ExamMode.tsx', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const examModePath = path.resolve(__dirname, '../../../screens/ExamMode.tsx');
    const src = fs.readFileSync(examModePath, 'utf-8');
    expect(src).not.toMatch(/from ['"].*reviewPool['"]/);
  });

  it('8. corrupt/missing state → empty pool via storageGet fallback', () => {
    localStorage.setItem(STORAGE_KEYS.reviewPool, '{{{not json');
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('sorts most-overdue-first', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 });
    advanceDays(1); // q-school-1 becomes due first
    recordReviewOutcome({ questionId: 'q-school-2', topicKey: 'school', score: 4 });
    advanceDays(1); // q-school-2 now also due, but later than q-school-1

    const result = getEligibleReviewQuestion('school', new Set());
    expect(result?.id).toBe('q-school-1');
    vi.restoreAllMocks();
  });

  it('excludes questions already seen this session (seenIds)', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 });
    advanceDays(1);
    expect(getEligibleReviewQuestion('school', new Set(['q-school-1']))).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('recordReviewOutcome — exact SM-2 sequences', () => {
  it('all-quality-5 (score=10) sequence: interval/EF progression through graduation', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    let item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(1);
    expect(item.easeFactor).toBeCloseTo(2.6, 5);
    expect(item.repetitions).toBe(1);

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(6);
    expect(item.easeFactor).toBeCloseTo(2.7, 5);
    expect(item.repetitions).toBe(2);

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(16);
    expect(item.easeFactor).toBeCloseTo(2.8, 5);
    expect(item.repetitions).toBe(3);

    // Round 4: interval = round(16 * 2.8) = 45 > 30 → graduates, item deleted.
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    expect(readStoredItem('q-school-1')).toBeUndefined();
  });

  it('all-quality-3 (score=6) sequence: interval/EF progression through graduation', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 6 });
    let item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(1);
    expect(item.easeFactor).toBeCloseTo(2.36, 5);

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 6 });
    item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(6);
    expect(item.easeFactor).toBeCloseTo(2.22, 5);

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 6 });
    item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(13);
    expect(item.easeFactor).toBeCloseTo(2.08, 5);

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 6 });
    item = readStoredItem('q-school-1');
    expect(item.intervalDays).toBe(27);
    expect(item.easeFactor).toBeCloseTo(1.94, 5);

    // Round 5: interval = round(27 * 1.94) = 52 > 30 → graduates, item deleted.
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 6 });
    expect(readStoredItem('q-school-1')).toBeUndefined();
  });

  it('a quality-2 (fail, score=4) at round 3 of an otherwise quality-5 run resets repetitions/interval but still updates ease', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 }); // round 1
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 }); // round 2: EF=2.7, interval=6, reps=2
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 }); // round 3: fail (quality=2)

    const item = readStoredItem('q-school-1');
    expect(item.repetitions).toBe(0);
    expect(item.intervalDays).toBe(1);
    expect(item.easeFactor).toBeCloseTo(2.38, 5);
  });

  it('graduation deletes the item; a subsequent answer to the same questionId starts a fresh schedule (repetitions=1, not resumed)', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 }); // graduates
    expect(readStoredItem('q-school-1')).toBeUndefined();

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 10 });
    const item = readStoredItem('q-school-1');
    expect(item.repetitions).toBe(1);
    expect(item.intervalDays).toBe(1);
    expect(item.easeFactor).toBeCloseTo(2.6, 5);
  });

  it('easeFactor never drops below MIN_EASE_FACTOR (1.3) even under repeated failures', () => {
    for (let i = 0; i < 20; i++) {
      recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 0 });
    }
    const item = readStoredItem('q-school-1');
    expect(item.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('stores the first recorded score as firstRecordedScore, retrievable via getReviewItemFirstRecordedScore', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4.5 });
    expect(getReviewItemFirstRecordedScore('q-school-1')).toBe(4.5);
  });

  it('firstRecordedScore stays pinned to the first answer, not later ones', () => {
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4.5 });
    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 9 });
    expect(getReviewItemFirstRecordedScore('q-school-1')).toBe(4.5);
  });

  it('getReviewItemFirstRecordedScore returns null for a question never recorded', () => {
    expect(getReviewItemFirstRecordedScore('never-recorded')).toBeNull();
  });
});

describe('backward-compatibility (direct change #3)', () => {
  it('no reviewPool key at all → empty-pool fallback, not undefined/throw', () => {
    expect(localStorage.getItem(STORAGE_KEYS.reviewPool)).toBeNull();
    expect(() => getEligibleReviewQuestion('school', new Set())).not.toThrow();
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('corrupted (non-JSON) stored value → empty pool, not a crash', () => {
    localStorage.setItem(STORAGE_KEYS.reviewPool, 'not valid json {{{');
    expect(() => getEligibleReviewQuestion('school', new Set())).not.toThrow();
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('wrong-shape stored value → empty pool, not a crash', () => {
    localStorage.setItem(STORAGE_KEYS.reviewPool, JSON.stringify({ foo: 'bar' }));
    expect(() => getEligibleReviewQuestion('school', new Set())).not.toThrow();
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('version !== REVIEW_POOL_VERSION → discarded, treated as empty (no migration attempted)', () => {
    localStorage.setItem(STORAGE_KEYS.reviewPool, JSON.stringify({
      version: 999,
      items: { 'q-school-1': { questionId: 'q-school-1', topicKey: 'school', easeFactor: 2.5, intervalDays: 1, repetitions: 1, nextEligibleAt: new Date(0).toISOString() } },
    }));
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
  });

  it('a pre-SM-2 store (version 2, flat cooldown shape) is discarded — bump to version 3 forces a clean rebuild', () => {
    localStorage.setItem(STORAGE_KEYS.reviewPool, JSON.stringify({
      version: 2,
      items: { 'q-school-1': { questionId: 'q-school-1', topicKey: 'school', failedAt: new Date().toISOString(), attempts: 1, sessionsSinceFailure: 5, nextEligibleAt: new Date(0).toISOString() } },
    }));
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();
    expect(getReviewItemFirstRecordedScore('q-school-1')).toBeNull();
  });
});

describe('feature flag gating', () => {
  it('recordReviewOutcome and getEligibleReviewQuestion both respect ?ff_learnSpacedReview=coming-soon', () => {
    const originalSearch = window.location.search;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?ff_learnSpacedReview=coming-soon' },
      writable: true,
    });

    recordReviewOutcome({ questionId: 'q-school-1', topicKey: 'school', score: 4 });
    expect(localStorage.getItem(STORAGE_KEYS.reviewPool)).toBeNull();
    expect(getEligibleReviewQuestion('school', new Set())).toBeNull();

    Object.defineProperty(window, 'location', { value: { ...window.location, search: originalSearch }, writable: true });
  });
});

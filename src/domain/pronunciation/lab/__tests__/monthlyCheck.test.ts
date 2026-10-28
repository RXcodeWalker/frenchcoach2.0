import { describe, expect, it } from 'vitest';
import { BENCHMARK_VERSION } from '../benchmark';
import { LAB_THRESHOLDS_VERSION } from '../thresholds';
import {
  MIN_COMPARABLE_SENTENCES,
  buildCheckResult,
  checkTrend,
  isCheckDue,
  sanitizeCheck,
  sentenceResult,
  type CheckSentenceResult,
  type MonthlyCheckResult,
} from '../monthlyCheck';
import { buildLabTake } from '../wordStates';
import { azureWord, scripted } from './labFixtures';

const check = (day: string, clears: number[], overrides: Partial<MonthlyCheckResult> = {}): MonthlyCheckResult => ({
  day,
  benchmarkVersion: BENCHMARK_VERSION,
  thresholdsVersion: LAB_THRESHOLDS_VERSION,
  sentences: clears.map((c, index) => ({ index, wordsClear: c, wordsTotal: 8 })),
  ...overrides,
});

describe('sentenceResult', () => {
  it('counts a usable take as N of M words clear', () => {
    const take = buildLabTake('Le vin rouge.', scripted([azureWord('le', 95), azureWord('vin', 50), azureWord('rouge', 90)]));
    expect(sentenceResult(2, take)).toEqual({ index: 2, wordsClear: 2, wordsTotal: 3 });
  });

  it('is not measured (never zero) for a refused or missing take', () => {
    const refused = buildLabTake('Le vin.', scripted([azureWord('le', 95)], { mode: 'freeform' }));
    expect(sentenceResult(0, refused)).toBeNull();
    expect(sentenceResult(0, null)).toBeNull();
  });
});

describe('buildCheckResult', () => {
  const r = (index: number): CheckSentenceResult => ({ index, wordsClear: 5, wordsTotal: 8 });

  it('stamps the versions and keeps the measured sentences in order', () => {
    expect(buildCheckResult([r(0), null, r(2), r(3), r(4)], '2026-11-02')).toEqual({
      day: '2026-11-02',
      benchmarkVersion: BENCHMARK_VERSION,
      thresholdsVersion: LAB_THRESHOLDS_VERSION,
      sentences: [r(0), r(2), r(3), r(4)],
    });
  });

  it('saves nothing when too few sentences were measured', () => {
    expect(buildCheckResult([r(0), r(1), null, null, null], '2026-11-02')).toBeNull();
  });
});

describe('isCheckDue', () => {
  it('is due until a check is finished in the current calendar month', () => {
    expect(isCheckDue([], '2026-11-02')).toBe(true);
    expect(isCheckDue([check('2026-10-30', [4, 4, 4, 4, 4])], '2026-11-02')).toBe(true);
    expect(isCheckDue([check('2026-11-01', [4, 4, 4, 4, 4])], '2026-11-30')).toBe(false);
  });
});

describe('checkTrend', () => {
  it('needs two checks', () => {
    expect(checkTrend([])).toBeNull();
    expect(checkTrend([check('2026-10-02', [4, 4, 4, 4, 4])])).toBeNull();
  });

  it('compares the latest check with the one before it, over the same sentences', () => {
    const trend = checkTrend([check('2026-10-02', [4, 5, 5, 4, 3]), check('2026-11-03', [6, 6, 7, 5, 6])]);
    expect(trend).toEqual({
      fromDay: '2026-10-02',
      toDay: '2026-11-03',
      sentences: 5,
      before: { clear: 21, total: 40 },
      after: { clear: 30, total: 40 },
    });
  });

  it('only counts sentences both checks measured', () => {
    const earlier = check('2026-10-02', [4, 5, 5, 4, 3]);
    earlier.sentences = earlier.sentences.filter((s) => s.index !== 1);
    const trend = checkTrend([earlier, check('2026-11-03', [6, 6, 7, 5, 6])]);
    expect(trend?.sentences).toBe(4);
    expect(trend?.after.total).toBe(32);
    expect(trend?.before.total).toBe(32);
  });

  it('says nothing when fewer than the minimum sentences are shared', () => {
    const earlier = check('2026-10-02', [4, 5]);
    const later = check('2026-11-03', [6, 6, 7, 5, 6]);
    expect(MIN_COMPARABLE_SENTENCES).toBe(3);
    expect(checkTrend([earlier, later])).toBeNull();
  });

  it('never compares across a benchmark or cut-off version change', () => {
    const later = check('2026-11-03', [6, 6, 7, 5, 6]);
    expect(checkTrend([check('2026-10-02', [4, 4, 4, 4, 4], { benchmarkVersion: 'lab-benchmark-v0' }), later])).toBeNull();
    expect(checkTrend([check('2026-10-02', [4, 4, 4, 4, 4], { thresholdsVersion: 'old' }), later])).toBeNull();
  });

  it('never compares a sentence whose word count changed', () => {
    const earlier = check('2026-10-02', [4, 4, 4, 4, 4]);
    earlier.sentences = earlier.sentences.map((s) => ({ ...s, wordsTotal: 9 }));
    expect(checkTrend([earlier, check('2026-11-03', [6, 6, 7, 5, 6])])).toBeNull();
  });
});

describe('sanitizeCheck', () => {
  it('accepts what buildCheckResult wrote', () => {
    const c = check('2026-11-03', [6, 6, 7]);
    expect(sanitizeCheck(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('rejects anything malformed', () => {
    expect(sanitizeCheck(null)).toBeNull();
    expect(sanitizeCheck({ ...check('2026-11-03', [1]), day: 'yesterday' })).toBeNull();
    expect(sanitizeCheck({ ...check('2026-11-03', [1]), sentences: [{ index: 0, wordsClear: 9, wordsTotal: 8 }] })).toBeNull();
    expect(sanitizeCheck({ ...check('2026-11-03', [1]), sentences: 'x' })).toBeNull();
  });
});

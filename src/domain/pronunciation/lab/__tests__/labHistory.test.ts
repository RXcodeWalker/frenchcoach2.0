import { describe, expect, it } from 'vitest';
import { localDay } from '../days';
import {
  EMPTY_LAB_HISTORY,
  MAX_CHECKS,
  MAX_OBSERVATIONS_PER_FAMILY,
  appendCheck,
  appendObservations,
  sanitizeLabHistory,
  type LabHistory,
} from '../labHistory';
import { BENCHMARK_VERSION } from '../benchmark';
import { LAB_THRESHOLDS_VERSION } from '../thresholds';
import type { MonthlyCheckResult } from '../monthlyCheck';

const obs = (family: 'frenchR' | 'uOu', accuracy: number) => ({ family, accuracy, basis: 'phoneme' as const });
const aCheck = (day: string): MonthlyCheckResult => ({
  day,
  benchmarkVersion: BENCHMARK_VERSION,
  thresholdsVersion: LAB_THRESHOLDS_VERSION,
  sentences: [{ index: 0, wordsClear: 3, wordsTotal: 6 }],
});

describe('localDay', () => {
  it('is the local calendar day, zero-padded', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDay(new Date(2026, 10, 28, 0, 1))).toBe('2026-11-28');
  });
});

describe('appendObservations', () => {
  it('stamps the day and rounds the accuracy', () => {
    const h = appendObservations(EMPTY_LAB_HISTORY, [obs('frenchR', 71.6)], '2026-11-02');
    expect(h.observations).toEqual([{ family: 'frenchR', accuracy: 72, basis: 'phoneme', day: '2026-11-02' }]);
  });

  it('a take with no evidence changes nothing', () => {
    expect(appendObservations(EMPTY_LAB_HISTORY, [], '2026-11-02')).toBe(EMPTY_LAB_HISTORY);
  });

  it('keeps each family’s most recent observations, so a busy family never evicts a quiet one', () => {
    let h: LabHistory = appendObservations(EMPTY_LAB_HISTORY, [obs('uOu', 50)], '2026-11-01');
    for (let i = 0; i < MAX_OBSERVATIONS_PER_FAMILY + 10; i++) h = appendObservations(h, [obs('frenchR', i % 100)], '2026-11-02');
    expect(h.observations.filter((o) => o.family === 'frenchR')).toHaveLength(MAX_OBSERVATIONS_PER_FAMILY);
    expect(h.observations.filter((o) => o.family === 'uOu')).toHaveLength(1);
    expect(h.observations[h.observations.length - 1].accuracy).toBe((MAX_OBSERVATIONS_PER_FAMILY + 9) % 100);
  });
});

describe('appendCheck', () => {
  it('ring-buffers the checks', () => {
    let h: LabHistory = EMPTY_LAB_HISTORY;
    for (let i = 0; i < MAX_CHECKS + 3; i++) h = appendCheck(h, aCheck(`2026-11-${String((i % 28) + 1).padStart(2, '0')}`));
    expect(h.checks).toHaveLength(MAX_CHECKS);
  });
});

describe('sanitizeLabHistory', () => {
  it('survives anything in storage', () => {
    expect(sanitizeLabHistory(null)).toEqual(EMPTY_LAB_HISTORY);
    expect(sanitizeLabHistory('nope')).toEqual(EMPTY_LAB_HISTORY);
    expect(sanitizeLabHistory({ observations: 3, checks: {} })).toEqual(EMPTY_LAB_HISTORY);
  });

  it('drops malformed rows and clamps accuracy, keeping the good ones', () => {
    const h = sanitizeLabHistory({
      v: 1,
      observations: [
        { family: 'frenchR', accuracy: 250, basis: 'word', day: '2026-11-02' },
        { family: 'liaison', accuracy: 50, basis: 'word', day: '2026-11-02' },
        { family: 'uOu', accuracy: 'x', basis: 'word', day: '2026-11-02' },
        { family: 'uOu', accuracy: 50, basis: 'word', day: 'soon' },
      ],
      checks: [aCheck('2026-11-02'), { day: 'bad' }],
    });
    expect(h.observations).toEqual([{ family: 'frenchR', accuracy: 100, basis: 'word', day: '2026-11-02' }]);
    expect(h.checks).toHaveLength(1);
  });
});

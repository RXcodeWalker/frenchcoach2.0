// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import { getBest, readBests, recordRun } from '../bests';
import type { RunSummary } from '../run';

const summary = (over: Partial<RunSummary> = {}): RunSummary => ({
  mode: 'sprint', endReason: 'time', score: 100, correct: 10, almost: 0, wrong: 2, skipped: 0, total: 12,
  accuracy: 83, maxStreak: 6, rank: 'B', log: [], ...over,
});
const at = (iso: string) => () => iso;

describe('rapid fire bests', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(readBests()).toEqual({ version: 1, sets: {} });
    expect(getBest('school')).toBeUndefined();
  });

  it('records a first run as a new best', () => {
    const r = recordRun('school', summary(), at('2026-10-30T10:00:00.000Z'));
    expect(r).toEqual({ previous: undefined, isNewBest: true });
    expect(getBest('school')).toEqual({ score: 100, maxStreak: 6, correct: 10, updatedAt: '2026-10-30T10:00:00.000Z' });
  });

  it('only a higher score is a new best; streak and correct keep their own maxima', () => {
    recordRun('school', summary(), at('2026-10-30T10:00:00.000Z'));
    const lower = recordRun('school', summary({ score: 80, maxStreak: 9 }), at('2026-10-31T10:00:00.000Z'));
    expect(lower.isNewBest).toBe(false);
    expect(lower.previous?.score).toBe(100);
    expect(getBest('school')).toMatchObject({ score: 100, maxStreak: 9, updatedAt: '2026-10-30T10:00:00.000Z' });
    const higher = recordRun('school', summary({ score: 140, correct: 14 }), at('2026-11-01T10:00:00.000Z'));
    expect(higher).toMatchObject({ isNewBest: true, previous: { score: 100 } });
    expect(getBest('school')).toMatchObject({ score: 140, correct: 14, updatedAt: '2026-11-01T10:00:00.000Z' });
  });

  it('keeps each word set separate', () => {
    recordRun('school', summary({ score: 100 }));
    recordRun('food', summary({ score: 50 }));
    expect(getBest('school')?.score).toBe(100);
    expect(getBest('food')?.score).toBe(50);
  });

  it('ignores a drill, an abandoned run and a run with no points', () => {
    expect(recordRun('school', summary({ mode: 'drill' })).isNewBest).toBe(false);
    expect(recordRun('school', summary({ endReason: 'quit' })).isNewBest).toBe(false);
    expect(recordRun('school', summary({ score: 0 })).isNewBest).toBe(false);
    expect(getBest('school')).toBeUndefined();
  });

  it('reads an unknown or corrupt value as empty and recovers', () => {
    localStorage.setItem(STORAGE_KEYS.rapidFireBests, JSON.stringify({ version: 99, sets: { school: { score: 999 } } }));
    expect(getBest('school')).toBeUndefined();
    localStorage.setItem(STORAGE_KEYS.rapidFireBests, '{{{nope');
    expect(readBests()).toEqual({ version: 1, sets: {} });
    expect(recordRun('school', summary()).isNewBest).toBe(true);
  });
});

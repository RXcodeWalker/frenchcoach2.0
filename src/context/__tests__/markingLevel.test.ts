// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { reducer, readMarkingLevel } from '../AppContext';
import { STORAGE_KEYS } from '../../services/persistence/storage';

afterEach(() => {
  localStorage.clear();
});

function baseState(): Parameters<typeof reducer>[0] {
  return { markingLevel: 'exam' } as unknown as Parameters<typeof reducer>[0];
}

describe('SET_MARKING_LEVEL reducer (learn-marking §8)', () => {
  it('stores the level raw and puts it in state', () => {
    const next = reducer(baseState(), { type: 'SET_MARKING_LEVEL', level: 'B1' });
    expect(next.markingLevel).toBe('B1');
    expect(localStorage.getItem(STORAGE_KEYS.markingLevel)).toBe('B1');
  });
});

describe('readMarkingLevel (boot-time read)', () => {
  it('defaults to Exam standard when nothing is stored', () => {
    expect(readMarkingLevel()).toBe('exam');
  });

  it('reads every valid level back', () => {
    for (const level of ['A1', 'A2', 'exam', 'B1', 'B2'] as const) {
      localStorage.setItem(STORAGE_KEYS.markingLevel, level);
      expect(readMarkingLevel()).toBe(level);
    }
  });

  it('falls back to Exam standard for an unknown value', () => {
    for (const bad of ['C1', 'Exam', '"B1"', '']) {
      localStorage.setItem(STORAGE_KEYS.markingLevel, bad);
      expect(readMarkingLevel()).toBe('exam');
    }
  });
});

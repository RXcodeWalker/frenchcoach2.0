// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { reducer, readDailyGoal, DAILY_GOAL_MIN, DAILY_GOAL_MAX } from '../AppContext';
import { STORAGE_KEYS } from '../../services/persistence/storage';

afterEach(() => {
  localStorage.clear();
});

// Minimal state fixture — only dailyGoal matters for SET_DAILY_GOAL.
function baseState(dailyGoal: number): Parameters<typeof reducer>[0] {
  return {
    dailyGoal,
  } as unknown as Parameters<typeof reducer>[0];
}

describe('SET_DAILY_GOAL reducer', () => {
  it('clamps a value above the max on write', () => {
    const next = reducer(baseState(3), { type: 'SET_DAILY_GOAL', goal: 99 });
    expect(next.dailyGoal).toBe(DAILY_GOAL_MAX);
    expect(localStorage.getItem(STORAGE_KEYS.dailyGoal)).toBe(String(DAILY_GOAL_MAX));
  });

  it('clamps a value below the min on write', () => {
    const next = reducer(baseState(3), { type: 'SET_DAILY_GOAL', goal: -5 });
    expect(next.dailyGoal).toBe(DAILY_GOAL_MIN);
    expect(localStorage.getItem(STORAGE_KEYS.dailyGoal)).toBe(String(DAILY_GOAL_MIN));
  });

  it('accepts an in-range value unchanged', () => {
    const next = reducer(baseState(3), { type: 'SET_DAILY_GOAL', goal: 7 });
    expect(next.dailyGoal).toBe(7);
  });
});

describe('readDailyGoal (boot-time read)', () => {
  it('falls back to the default (3) for a malformed stored value', () => {
    for (const bad of ['abc', '-5', 'Infinity', '']) {
      localStorage.setItem(STORAGE_KEYS.dailyGoal, bad);
      expect(readDailyGoal()).toBe(3);
    }
  });

  it('reads and clamps a valid stored value', () => {
    localStorage.setItem(STORAGE_KEYS.dailyGoal, '99');
    expect(readDailyGoal()).toBe(DAILY_GOAL_MAX);
  });

  it('defaults to 3 when nothing is stored', () => {
    expect(readDailyGoal()).toBe(3);
  });
});

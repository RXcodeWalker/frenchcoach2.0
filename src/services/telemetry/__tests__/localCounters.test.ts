// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { incrementCounter, getCounters, resetCounters } from '../localCounters';
import { STORAGE_KEYS } from '../../persistence/storage';

describe('localCounters', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(getCounters()).toEqual({});
  });

  it('increments a counter from zero', () => {
    incrementCounter('practice_step_shown');
    expect(getCounters().practice_step_shown).toBe(1);
  });

  it('increments the same counter across multiple calls independently of others', () => {
    incrementCounter('practice_step_shown');
    incrementCounter('practice_step_shown');
    incrementCounter('transcript_confirmed');

    const counters = getCounters();
    expect(counters.practice_step_shown).toBe(2);
    expect(counters.transcript_confirmed).toBe(1);
    expect(counters.practice_step_completed_pass).toBeUndefined();
  });

  it('does not throw and resets to zero on corrupt localStorage JSON', () => {
    localStorage.setItem(STORAGE_KEYS.localCounters, '{{{not json');

    expect(() => getCounters()).not.toThrow();
    expect(getCounters()).toEqual({});

    expect(() => incrementCounter('practice_step_shown')).not.toThrow();
    expect(getCounters().practice_step_shown).toBe(1);
  });

  it('resets to zero on a stored version mismatch (future/older schema)', () => {
    localStorage.setItem(
      STORAGE_KEYS.localCounters,
      JSON.stringify({ version: 999, counts: { practice_step_shown: 42 } }),
    );

    expect(getCounters()).toEqual({});
  });

  it('resetCounters clears all counts', () => {
    incrementCounter('practice_step_shown');
    incrementCounter('transcript_confirmed');
    resetCounters();

    expect(getCounters()).toEqual({});
  });
});

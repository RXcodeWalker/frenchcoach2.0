import { describe, expect, it } from 'vitest';
import { applyLadderResult, emptyLadder, recordLadderResult, STREAK_TO_CLIMB, type WordLadder } from '../ladder';

describe('ladder', () => {
  it('climbs after three rights and never drops on a miss', () => {
    let state: WordLadder = { rung: 'tap', streak: 0 };
    for (let i = 0; i < STREAK_TO_CLIMB; i++) state = recordLadderResult(state, true);
    expect(state).toEqual({ rung: 'type', streak: 0 });
    state = recordLadderResult(state, false);
    expect(state).toEqual({ rung: 'type', streak: 0 });
    for (let i = 0; i < STREAK_TO_CLIMB; i++) state = recordLadderResult(state, true);
    expect(state.rung).toBe('say');
    state = recordLadderResult(state, false);
    expect(state.rung).toBe('say');
  });

  it('keeps other words untouched', () => {
    const next = applyLadderResult(emptyLadder(), 'ou', true);
    expect(next.ou.streak).toBe(1);
    expect(next.qui.streak).toBe(0);
    expect(next.qui.rung).toBe('tap');
  });
});

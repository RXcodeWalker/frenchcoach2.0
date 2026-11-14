// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import { applyLadderResult, emptyLadder } from '../ladder';
import { readDetectiveStore, recordAnswerRound, recordCaseSolved, recordMixup, saveLadder } from '../detectiveStore';

afterEach(() => {
  localStorage.removeItem(STORAGE_KEYS.questionDetective);
});

describe('detectiveStore', () => {
  it('starts empty and keeps a versioned payload', () => {
    const stored = readDetectiveStore();
    expect(stored.version).toBe(1);
    expect(stored.rungs.qui.rung).toBe('tap');
    expect(stored.casesSolved).toEqual([]);
  });

  it('records mix-ups, bests and solved cases', () => {
    saveLadder(applyLadderResult(emptyLadder(), 'ou', true));
    recordMixup('ou|quand');
    recordMixup('ou|quand');
    recordAnswerRound(6);
    recordCaseSolved('croissant');
    const stored = readDetectiveStore();
    expect(stored.rungs.ou.streak).toBe(1);
    expect(stored.mixups['ou|quand']).toBe(2);
    expect(stored.bests.answer).toBe(6);
    expect(stored.casesSolved).toEqual(['croissant']);
  });
});

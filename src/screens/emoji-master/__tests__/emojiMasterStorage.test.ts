// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModeBest,
  readEmojiMasterBests,
  shouldUpdatePersonalBest,
  updatePersonalBest,
  writeEmojiMasterBests,
} from '../emojiMasterStorage';
import type { SessionCompletion } from '../types';
import { STORAGE_KEYS } from '../../../services/persistence/storage';

function makeCompletion(
  overrides: Partial<SessionCompletion> = {}
): SessionCompletion {
  return {
    mode: 'classic',
    endReason: 'completed',
    modeScore: 8,
    correctAnswers: 8,
    totalAnswered: 10,
    maxStreak: 4,
    history: [],
    xpAwarded: 80,
    ...overrides,
  };
}

describe('emojiMasterStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty defaults for missing or wrong version', () => {
    expect(readEmojiMasterBests()).toEqual({ version: 1, modes: {} });
    localStorage.setItem(
      STORAGE_KEYS.emojiMasterBests,
      JSON.stringify({ version: 99, modes: { classic: { modeScore: 9 } } })
    );
    expect(readEmojiMasterBests()).toEqual({ version: 1, modes: {} });
  });

  it('does not update on quit', () => {
    expect(shouldUpdatePersonalBest('quit', 99)).toBe(false);
  });

  it('updates when score beats existing', () => {
    const first = updatePersonalBest(makeCompletion({ modeScore: 5 }), 'B', () =>
      '2020-01-01T00:00:00.000Z'
    );
    expect(first.modes.classic?.modeScore).toBe(5);

    updatePersonalBest(makeCompletion({ modeScore: 4 }), 'C', () =>
      '2020-01-02T00:00:00.000Z'
    );
    expect(getModeBest('classic')?.modeScore).toBe(5);

    updatePersonalBest(makeCompletion({ modeScore: 9 }), 'A', () =>
      '2020-01-03T00:00:00.000Z'
    );
    expect(getModeBest('classic')?.modeScore).toBe(9);
    expect(getModeBest('classic')?.bestGrade).toBe('A');
  });

  it('round-trips writes', () => {
    writeEmojiMasterBests({
      version: 1,
      modes: {
        blitz: {
          modeScore: 20,
          maxStreak: 7,
          bestGrade: 'S',
          updatedAt: 't',
        },
      },
    });
    expect(getModeBest('blitz')?.modeScore).toBe(20);
  });
});

import { WORD_IDS, type WordId } from '../../data/questionWords/types';

/** Per-word answering mode (question-detective §2). A miss never drops a rung. */
export type Rung = 'tap' | 'type' | 'say';

export const RUNGS: readonly Rung[] = ['tap', 'type', 'say'];
export const STREAK_TO_CLIMB = 3;

export interface WordLadder {
  rung: Rung;
  streak: number;
}

export type LadderMap = Record<WordId, WordLadder>;

export function emptyLadder(): LadderMap {
  const out = {} as LadderMap;
  for (const id of WORD_IDS) out[id] = { rung: 'tap', streak: 0 };
  return out;
}

function nextRung(rung: Rung): Rung {
  if (rung === 'tap') return 'type';
  if (rung === 'type') return 'say';
  return 'say';
}

/** Apply one right/wrong result. A miss resets the streak but never the rung. */
export function recordLadderResult(ladder: WordLadder, right: boolean): WordLadder {
  if (!right) return { rung: ladder.rung, streak: 0 };
  const streak = ladder.streak + 1;
  if (streak >= STREAK_TO_CLIMB && ladder.rung !== 'say') {
    return { rung: nextRung(ladder.rung), streak: 0 };
  }
  return { rung: ladder.rung, streak };
}

export function applyLadderResult(map: LadderMap, wordId: WordId, right: boolean): LadderMap {
  return { ...map, [wordId]: recordLadderResult(map[wordId] ?? { rung: 'tap', streak: 0 }, right) };
}

export function rungOf(map: LadderMap, wordId: WordId): Rung {
  return map[wordId]?.rung ?? 'tap';
}

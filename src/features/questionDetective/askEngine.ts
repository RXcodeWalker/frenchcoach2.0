import { DETECTIVE_BANK } from '../../data/questionWords/bank';
import { WORD_IDS, type DetectiveQuestion, type WordId } from '../../data/questionWords/types';
import { pickIndex, shuffle } from './rng';

export interface AskItem {
  question: DetectiveQuestion;
  /** Four tools to pick from, including the right one. */
  wordChoices: WordId[];
  tiles: string[];
}

export function buildAskRound(rand: () => number, size = 6): AskItem[] {
  const pool = shuffle(DETECTIVE_BANK, rand);
  const items: AskItem[] = [];
  const used = new Set<string>();
  for (const question of pool) {
    if (used.has(question.id)) continue;
    used.add(question.id);
    const others = shuffle(WORD_IDS.filter(id => id !== question.wordId), rand).slice(0, 3);
    const wordChoices = shuffle([question.wordId, ...others], rand);
    const tiles = shuffle(question.tiles, rand);
    items.push({ question, wordChoices, tiles });
    if (items.length >= size) break;
  }
  return items;
}

export function pickAskItem(rand: () => number, avoid: Set<string>): AskItem {
  const pool = DETECTIVE_BANK.filter(q => !avoid.has(q.id));
  const question = (pool.length ? pool : DETECTIVE_BANK)[pickIndex(rand, (pool.length ? pool : DETECTIVE_BANK).length)];
  const others = shuffle(WORD_IDS.filter(id => id !== question.wordId), rand).slice(0, 3);
  return {
    question,
    wordChoices: shuffle([question.wordId, ...others], rand),
    tiles: shuffle(question.tiles, rand),
  };
}

export function tilesMatch(placed: readonly string[], expected: readonly string[]): boolean {
  return placed.join(' ').toLowerCase() === expected.join(' ').toLowerCase();
}

import { TYPE_TO_WORD, type DetectiveQuestion, type WordId } from '../../data/questionWords/types';
import { normalizeFrench } from '../minigames/utils/normalizeFrench';
import { classifyAnswer } from './answerType';

/**
 * How Question Detective marks one 1–3 word answer (question-detective §2).
 *
 *   right    matches an accepted spelling (accents optional, article flexible)
 *   almost   one typo away from an accepted spelling
 *   mixup    a known answer of a *different* type — name both words
 *   miss     anything else
 */

export type Verdict = 'right' | 'almost' | 'mixup' | 'miss';

export interface Judgement {
  verdict: Verdict;
  expected: string;
  /** Set on mixup: the word the learner's answer actually belongs to. */
  givenWord?: WordId;
}

const SKIP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'a', 'au', 'aux', 'de', 'du', 'en', "l'"]);

function fold(s: string): string {
  return normalizeFrench(s.replace(/-/g, ' '));
}

function stripSkip(s: string): string {
  const parts = s.split(' ').filter(Boolean);
  while (parts.length > 1 && SKIP.has(parts[0])) parts.shift();
  if (parts[0]?.startsWith("l'") && parts[0].length > 2) parts[0] = parts[0].slice(2);
  return parts.join(' ');
}

function comparable(s: string): string {
  return stripSkip(fold(s));
}

/** Optimal string alignment distance. */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function typoBudget(len: number): number {
  if (len >= 13) return 2;
  if (len >= 5) return 1;
  return 0;
}

export function judgeAnswer(input: string, question: Pick<DetectiveQuestion, 'accepted' | 'model' | 'wordId'>): Judgement {
  const expected = question.model;
  const typed = comparable(input);
  if (!typed) return { verdict: 'miss', expected };

  const matched = question.accepted.find(a => comparable(a) === typed);
  if (matched !== undefined) return { verdict: 'right', expected: matched };

  let best: { answer: string; distance: number } | null = null;
  for (const answer of question.accepted) {
    const target = comparable(answer);
    const distance = editDistance(typed, target);
    if (distance <= typoBudget(target.length) && (!best || distance < best.distance)) {
      best = { answer, distance };
    }
  }
  if (best) return { verdict: 'almost', expected: best.answer };

  const otherType = classifyAnswer(input);
  if (otherType && TYPE_TO_WORD[otherType] !== question.wordId) {
    return { verdict: 'mixup', expected, givenWord: TYPE_TO_WORD[otherType] };
  }

  return { verdict: 'miss', expected };
}

export function mixupKey(expected: WordId, given: WordId): string {
  return `${expected}|${given}`;
}

export function parseMixupKey(key: string): { expected: WordId; given: WordId } | null {
  const [expected, given] = key.split('|');
  if (!expected || !given) return null;
  return { expected: expected as WordId, given: given as WordId };
}

import { questionWord } from '../../data/questionWords/words';
import type { WordId } from '../../data/questionWords/types';
import type { Verdict } from './judge';

export function lemma(id: WordId): string {
  return questionWord(id)?.lemma ?? id;
}

export function finds(id: WordId): string {
  return questionWord(id)?.finds ?? '';
}

export function hintFor(id: WordId): string {
  return questionWord(id)?.hint ?? '';
}

export function mixupLine(expected: WordId, given: WordId): string {
  const got = lemma(given);
  const want = lemma(expected);
  return `${want} finds ${finds(expected)}, but that answers ${got}.`;
}

export function verdictLine(verdict: Verdict, expected: string, expectedWord: WordId, given?: WordId): string {
  if (verdict === 'right') return 'That’s the kind of answer this word wants.';
  if (verdict === 'almost') return `Almost — the answer is « ${expected} ».`;
  if (verdict === 'mixup' && given) return mixupLine(expectedWord, given);
  return `Not quite. A good answer is « ${expected} ».`;
}

export function mixupSummary(expected: WordId, given: WordId): string {
  return `You sometimes answer ${lemma(expected)} with ${finds(given)}. Let’s practise those two.`;
}

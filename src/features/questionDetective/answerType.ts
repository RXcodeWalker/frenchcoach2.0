import { DETECTIVE_BANK } from '../../data/questionWords/bank';
import { TYPE_TO_WORD, type AnswerType, type WordId } from '../../data/questionWords/types';
import { normalizeFrench } from '../minigames/utils/normalizeFrench';

/**
 * Closed lookup of every authored answer → its type (question-detective §2).
 * No guessing: an unknown string has no type.
 */

export function answerKey(s: string): string {
  return normalizeFrench(s.replace(/-/g, ' '));
}

const TYPE_INDEX: Map<string, AnswerType> = (() => {
  const map = new Map<string, AnswerType>();
  for (const q of DETECTIVE_BANK) {
    for (const a of q.accepted) map.set(answerKey(a), q.answerType);
  }
  return map;
})();

export function classifyAnswer(input: string): AnswerType | null {
  const key = answerKey(input);
  if (!key) return null;
  return TYPE_INDEX.get(key) ?? null;
}

export function wordForType(type: AnswerType): WordId {
  return TYPE_TO_WORD[type];
}

export function knownAnswersOfType(type: AnswerType): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const q of DETECTIVE_BANK) {
    if (q.answerType !== type) continue;
    const key = answerKey(q.model);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q.model);
  }
  return out;
}

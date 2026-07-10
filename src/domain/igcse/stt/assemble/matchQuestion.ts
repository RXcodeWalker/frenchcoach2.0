/**
 * S3 question matching — normalised token-set similarity against a SessionQuestionSet.
 * Uses the same normaliser as L3's quote-verification guardrail (text/normalize.ts)
 * so S3 and L3 agree on what "the same text" means.
 */

import { normalizeForMatch } from '../../text/normalize';
import { MATCH_THRESHOLD } from '../version';
import type { SessionQuestion, SessionQuestionSet } from '../types';

export interface QuestionMatch {
  questionId: string;
  /** 'main' if it matched mainText, 'alternative' if it matched one of alternativeTexts. */
  variant: 'main' | 'alternative';
  /** 0..1 */
  score: number;
}

function tokenize(text: string): Set<string> {
  return new Set(normalizeForMatch(text).split(' ').filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Scores `text` against every (main + alternative) text of every question in the
 * set, and returns the single best match above MATCH_THRESHOLD, or null if none
 * clears the bar. Ties are broken by first-seen question order (deterministic).
 */
export function matchQuestion(text: string, questionSet: SessionQuestionSet): QuestionMatch | null {
  const textTokens = tokenize(text);
  let best: QuestionMatch | null = null;

  for (const question of questionSet.questions) {
    const candidates: Array<{ variant: 'main' | 'alternative'; text: string }> = [
      { variant: 'main', text: question.mainText },
      ...question.alternativeTexts.map((t) => ({ variant: 'alternative' as const, text: t })),
    ];

    for (const candidate of candidates) {
      const score = jaccardSimilarity(textTokens, tokenize(candidate.text));
      if (score >= MATCH_THRESHOLD && (best === null || score > best.score)) {
        best = { questionId: question.questionId, variant: candidate.variant, score };
      }
    }
  }

  return best;
}

export function matchThresholdConstant(): number {
  return MATCH_THRESHOLD;
}

export type { SessionQuestion };

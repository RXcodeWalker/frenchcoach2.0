/**
 * Maps a POST /score failure onto the `code` the 500 body carries. The code
 * is what tells the client this was a definitive server-side failure (retry
 * with a fresh POST) rather than an ambiguous one (poll GET first): see
 * src/services/exam/scoringApiClient.ts. The raw error text is still never
 * sent to the client — only this code.
 */

import { JudgementValidationError } from '../src/domain/igcse/judgement/schema';
import { JudgeUnavailableError } from '../scripts/scoring/providers/judgeFactory';

export type ScoringFailureCode = 'judge_invalid_output' | 'judge_unavailable' | 'internal';

export function classifyScoringFailure(err: unknown): ScoringFailureCode {
  // The judge replied, but the reply failed parsing/validation twice
  // (scoreAttempt already made its one retry).
  if (err instanceof JudgementValidationError) return 'judge_invalid_output';
  // Neither Gemini nor the Groq fallback returned a reply at all.
  if (err instanceof JudgeUnavailableError) return 'judge_unavailable';
  return 'internal';
}

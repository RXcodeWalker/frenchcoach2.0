/**
 * "The examiner's next question" (Learn feedback Batch 6c): the model's own
 * `followUpQuestion` becomes the prompt of Learn's existing follow-up turn, so
 * it is treated as untrusted text twice over — it is shown to the learner as
 * what an examiner would ask, and it is then sent back to the backend as the
 * question text of the next attempt.
 *
 * `cleanFollowUpQuestion` therefore accepts only a short, single-line, French
 * looking question made of plain letters and punctuation, with no mark or band
 * language (ADR 0005). Anything else is dropped — never rewritten — and Learn
 * falls back to the question's authored follow-up (or offers none).
 *
 * Pure. Imports the same shared mark filter as filterCoachFeedback.
 */
import { claimMentionsMarkOrBand } from '../../examFeedback/shared/markClaimFilter';

const MIN_LENGTH = 8;
const MAX_LENGTH = 160;
/** Letters (any script, so accents), digits, spaces, and the punctuation a French question uses. */
const PLAIN = /^[\p{L}\p{N}\s'’\-,.;:!?«»()"…]+$/u;
/** The prompt asks for French; an English question opener means it did not follow. */
const ENGLISH_OPENER = /^(?:what|why|how|do|does|did|can|could|would|will|where|when|who|which|is|are|have|has|tell)\b/i;

export function cleanFollowUpQuestion(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) return undefined;
  if (!text.endsWith('?') || !PLAIN.test(text)) return undefined;
  if (ENGLISH_OPENER.test(text)) return undefined;
  if (claimMentionsMarkOrBand(text)) return undefined;
  return text;
}

/**
 * The prompt Learn's follow-up turn will use: the model's question for the Coach
 * voice (it continues THIS conversation), else the question's authored first
 * follow-up. The Examiner voice has no model question, so it passes none.
 */
export function pickFollowUpPrompt(modelQuestion: string | undefined, authored: readonly string[] | undefined): string | null {
  return modelQuestion?.trim() || authored?.find((q) => q.trim()) || null;
}

/**
 * Examiner-voice practice feedback for a single Learn answer: real Cambridge
 * IGCSE French 0520 descriptor language (structures/vocabulary only), every
 * claim quote-verified against the candidate's own transcript, and NO mark,
 * band number, or /40 total — see roadmap.md S7/S10 framing ("practice
 * feedback in examiner language, not a grade prediction").
 *
 * This is deliberately NOT the audited Cambridge scorer (src/domain/igcse/).
 * A single Learn answer cannot fill SpeakingTranscript's fixed shape (exactly
 * 5 role-play tasks + topic1/topic2), and roadmap S7 forbids building the
 * Azure-into-Cambridge pipeline in this phase. This module only borrows two
 * things from that audited layer: rubric descriptor TEXT (data, not scoring
 * logic) and the quote-verification primitive `isQuoteGrounded`. It must
 * never import scoring/envelope/guardrails/session code — enforced by the
 * scoped no-restricted-imports rule in eslint.config.js and by
 * __tests__/examinerFeedback.importGraph.test.ts.
 */

import { COMMUNICATION, QUALITY_OF_LANGUAGE, MARKING_PRINCIPLES } from '../../domain/igcse/rubric';
import { isQuoteGrounded } from '../../domain/igcse/judgement/schema';

export interface ExaminerCitedClaim {
  claim: string;
  quote: string;
}

export interface ExaminerFeedback {
  /** Which descriptor language this answer currently reflects, for structures and vocabulary. */
  currentDescriptorCommentary: ExaminerCitedClaim[];
  /** What would move the answer up a band — still commentary, never a predicted mark. */
  improvementCommentary: ExaminerCitedClaim[];
}

const TOPIC_CONVERSATION_PRINCIPLES = MARKING_PRINCIPLES.filter(
  (p) => p.scope === 'topicConversation' || p.scope === 'global',
);

/**
 * Builds the examiner-register prompt for one answer. Deliberately asks for
 * ONLY descriptor commentary + verbatim quotes — no numeric output at all,
 * so there is nothing for a quality gate to strip after the fact.
 */
export function buildExaminerPrompt(question: string, transcript: string): string {
  const commDescriptors = COMMUNICATION.bands
    .filter((b) => b.label !== null)
    .map((b) => `- ${b.label}: ${b.descriptor.join(' ')}`)
    .join('\n');

  const qolDescriptors = QUALITY_OF_LANGUAGE.bands
    .filter((b) => b.label !== null)
    .map((b) => `- ${b.label}: ${b.descriptor.join(' ')}`)
    .join('\n');

  const principles = TOPIC_CONVERSATION_PRINCIPLES.map((p) => `- ${p.text}`).join('\n');

  return (
    `You are a Cambridge IGCSE French 0520 examiner giving PRACTICE feedback in ` +
    `examiner register — not a grade prediction. You must NEVER output a mark, a ` +
    `band number, a score out of 15 or 40, or a letter grade. Your entire output is ` +
    `qualitative commentary tied to the official mark-scheme descriptor language.\n\n` +
    `QUESTION (French): ${question}\n\n` +
    `CANDIDATE TRANSCRIPT (French): ${transcript}\n\n` +
    `COMMUNICATION descriptor language (Table B):\n${commDescriptors}\n\n` +
    `QUALITY OF LANGUAGE descriptor language (Table C):\n${qolDescriptors}\n\n` +
    `MARKING PRINCIPLES that apply to topic-conversation-style answers:\n${principles}\n\n` +
    `Task: identify which descriptor language this answer currently reflects for ` +
    `STRUCTURES and VOCABULARY, and what would move it toward the next band up. ` +
    `EVERY claim must be tied to a verbatim quote from the candidate transcript above ` +
    `— copy the exact words, do not paraphrase the quote.\n\n` +
    `SCOPE LIMIT: say nothing about pronunciation or delivery — that is assessed ` +
    `separately from audio. Cover structures and vocabulary only.\n\n` +
    `Return ONLY this JSON (nothing else):\n` +
    `{\n` +
    `  "currentDescriptorCommentary": [ { "claim": "<examiner-register observation>", "quote": "<verbatim from transcript>" } ],\n` +
    `  "improvementCommentary": [ { "claim": "<what would move this up>", "quote": "<verbatim from transcript>" } ]\n` +
    `}\n\n` +
    `Do not include marks, bands, numbers, or totals anywhere in the JSON values.`
  );
}

/** Drops any cited claim whose quote cannot be found verbatim in the transcript. */
export function groundExaminerFeedback(raw: ExaminerFeedback, transcript: string): ExaminerFeedback {
  const groundClaims = (claims: ExaminerCitedClaim[]): ExaminerCitedClaim[] =>
    claims.filter((c) => isQuoteGrounded(c.quote, transcript));

  return {
    currentDescriptorCommentary: groundClaims(raw.currentDescriptorCommentary ?? []),
    improvementCommentary: groundClaims(raw.improvementCommentary ?? []),
  };
}

export function isExaminerFeedbackEmpty(feedback: ExaminerFeedback): boolean {
  return feedback.currentDescriptorCommentary.length === 0 && feedback.improvementCommentary.length === 0;
}

export class ExaminerGroundingFailedError extends Error {
  constructor() {
    super("Couldn't produce evidence-backed examiner feedback for this answer");
    this.name = 'ExaminerGroundingFailedError';
  }
}

/**
 * Calls `generate` (a caller-supplied model call returning raw JSON text),
 * grounds every citation against the transcript, and retries exactly once —
 * with a verbatim-quoting reminder — if grounding removed every citation.
 * Two consecutive fully-ungrounded results means the answer is too short to
 * quote, not a transient model slip, so this throws rather than retrying
 * again.
 */
export async function getGroundedExaminerFeedback(
  question: string,
  transcript: string,
  generate: (prompt: string) => Promise<ExaminerFeedback>,
): Promise<ExaminerFeedback> {
  const prompt = buildExaminerPrompt(question, transcript);
  const first = groundExaminerFeedback(await generate(prompt), transcript);
  if (!isExaminerFeedbackEmpty(first)) return first;

  const retryPrompt =
    `${prompt}\n\nREMINDER: your previous attempt's quotes did not appear verbatim in the ` +
    `transcript. Copy the candidate's exact words for every "quote" field — no paraphrasing.`;
  const second = groundExaminerFeedback(await generate(retryPrompt), transcript);
  if (!isExaminerFeedbackEmpty(second)) return second;

  throw new ExaminerGroundingFailedError();
}

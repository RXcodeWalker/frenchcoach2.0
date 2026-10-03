/**
 * Generates the post-marking exam report for an already-persisted envelope
 * (Phase 3 Batch A, ADR 0009). The model call is injected as a plain
 * `(prompt) => Promise<string>`, so this module has no provider, network or
 * storage dependency and can be tested with a fake.
 *
 * One retry, as with the Learn/rail grounding retry: an unusable first reply
 * (not JSON, a missing section, nothing grounded) is asked again with a
 * reminder; a second unusable reply throws. A generator (provider) error is
 * not retried here — it propagates, and the caller releases the quota grant
 * and stores nothing.
 *
 * The envelope is read only; generating feedback cannot change a mark.
 */

import type { ScoringEnvelope } from '../igcse/envelope/types';
import { EXAM_FEEDBACK_RETRY_REMINDER, buildExamFeedbackPrompt } from './prompt';
import { parseExamFeedback } from './schema';
import type { ExamFeedbackReport } from './types';

export type ExamFeedbackGenerator = (prompt: string) => Promise<string>;

export class ExamFeedbackInvalidOutputError extends Error {
  constructor() {
    super('exam feedback: the model returned no usable report after one retry');
    this.name = 'ExamFeedbackInvalidOutputError';
  }
}

export const EXAM_FEEDBACK_MAX_ATTEMPTS = 2;

export async function generateExamFeedback(
  envelope: ScoringEnvelope,
  generate: ExamFeedbackGenerator,
): Promise<ExamFeedbackReport> {
  const prompt = buildExamFeedbackPrompt(envelope);
  for (let attempt = 1; attempt <= EXAM_FEEDBACK_MAX_ATTEMPTS; attempt++) {
    const raw = await generate(attempt === 1 ? prompt : prompt + EXAM_FEEDBACK_RETRY_REMINDER);
    const report = parseExamFeedback(raw, envelope);
    if (report) return report;
  }
  throw new ExamFeedbackInvalidOutputError();
}

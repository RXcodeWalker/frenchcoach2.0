/**
 * Version of the post-marking exam report (Phase 3 Batch A). Bump it together
 * with the pinned prompt hash in __tests__/version.test.ts whenever the
 * prompt, the output shape or a validation rule changes. It is stored on every
 * report row (`exam_feedback_reports.feedback_version`), so a report written by
 * an older version is never mistaken for the current one.
 *
 * Independent of every scoring version (SCORING_PROMPT_VERSION,
 * GUARDRAILS_VERSION, RUBRIC_VERSION, ENVELOPE_SCHEMA_VERSION): the report is
 * generated after marking and cannot change a mark (ADR 0009).
 */
export const EXAM_FEEDBACK_VERSION = 'exam-feedback-v0.1';

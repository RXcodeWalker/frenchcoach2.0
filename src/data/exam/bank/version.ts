/**
 * S11 question-bank schema versioning. Mirrors stt/version.ts: a breaking
 * shape change bumps QUESTION_BANK_SCHEMA_VERSION and adds a new dispatch arm
 * in validate.ts (with an upcaster if data must migrate) — never silent coercion.
 */

export const QUESTION_BANK_SCHEMA_VERSION = 'question-bank-v1';

/**
 * Learn-demands schema versioning. Mirrors src/data/exam/bank/version.ts: a
 * breaking shape change bumps LEARN_DEMANDS_SCHEMA_VERSION and adds a new
 * dispatch arm in validate.ts — never silent coercion.
 */

export const LEARN_DEMANDS_SCHEMA_VERSION = 'learn-demands-v1';

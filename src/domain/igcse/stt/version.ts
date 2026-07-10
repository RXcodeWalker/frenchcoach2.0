/**
 * S3 STT schema/assembler versioning. Any change to assembleSession or its
 * sub-passes bumps STT_ASSEMBLER_VERSION (mirrors the version-bump discipline
 * in 02-scoring-pipeline-architecture.md §3.8).
 */

export const STT_SCHEMA_VERSION = 'session-transcript-v1';
export const STT_ASSEMBLER_VERSION = 'stt-assembler-v1';

/** Token-set similarity threshold for question matching (matchQuestion.ts). */
export const MATCH_THRESHOLD = 0.6;

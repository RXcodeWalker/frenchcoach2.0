/**
 * S3 STT schema/assembler versioning. Any change to assembleSession or its
 * sub-passes bumps STT_ASSEMBLER_VERSION (mirrors the version-bump discipline
 * in 02-scoring-pipeline-architecture.md §3.8).
 */

/**
 * v2 adds Utterance.turnKey and Utterance.recognition (exam answers marked from
 * batch ASR). v1 stays readable: parseSessionTranscript upcasts it.
 */
export const STT_SCHEMA_VERSION = 'session-transcript-v2';
/** Bumped to -v2 with the schema: assembleSession now emits session-transcript-v2. */
export const STT_ASSEMBLER_VERSION = 'stt-assembler-v2';

/** Token-set similarity threshold for question matching (matchQuestion.ts). */
export const MATCH_THRESHOLD = 0.6;

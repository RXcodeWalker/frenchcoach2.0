/**
 * S10 session-engine versioning. Bump on any change to conductEngine's rule
 * behaviour or buildSessionTranscript's mapping (mirrors the version-bump
 * discipline in 02-scoring-pipeline-architecture.md §3.8).
 *
 * v5: buildSessionTranscript emits session-transcript-v2 (turnKey, per-answer
 * batch-ASR recognition record). Conduct rules are unchanged; the bump discards
 * mid-exam resume snapshots at deploy, which is intended.
 */

export const SESSION_ENGINE_VERSION = 'session-engine-v5';

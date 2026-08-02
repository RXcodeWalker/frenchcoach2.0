/**
 * Thresholds for the "Say It Again" practice step (Learn Mode, Phase 2
 * Slice 4). UNVALIDATED per CLAUDE.md constraint #2 — no calibration data
 * exists yet; these are placeholders in the same spirit as
 * backend/services/pronunciation/azure_client.py's _LOW_ACCURACY_THRESHOLD.
 * PronunciationLab.tsx imports PRACTICE_PASS_SCORE instead of its own
 * hardcoded 70 so the two surfaces can't silently drift apart.
 */

/** UNVALIDATED — Azure PronScore 0-100. */
export const PRACTICE_PASS_SCORE = 70;
/** UNVALIDATED — Azure PronScore 0-100. */
export const PRACTICE_NEAR_MISS_SCORE = 55;
/** Product decision, not a measurement: at most one retry per attempt. */
export const PRACTICE_MAX_ATTEMPTS = 2;
/** Product decision, not a measurement: caps session length (R5). */
export const PRACTICE_MAX_PER_SESSION = 3;

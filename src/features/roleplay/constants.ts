/**
 * Shared roleplay-runtime constants.
 *
 * Staging rule 2 in the Explore/Roleplay overhaul plan: "Shared constants live
 * in `src/features/roleplay/constants.ts`. No stage redeclares one." The
 * validator (Stage 2), the intent matcher and session reducer (Stage 4), and
 * the unlock selector (Stage 8) all read from here.
 */

/**
 * Hard cap on user turns in a single session. One of the three independent
 * termination guarantees (terminal state, this cap, misfire skip). Sits well
 * above the deepest authored graph — hairdresser reaches a terminal in 8.
 */
export const MAX_TURNS = 30;

/**
 * Consecutive `ambiguous`/`no_match` turns at one state before the runtime
 * performs an explicit skip. The skipping turn is recorded as
 * `{ kind: 'skipped' }`, satisfies no mission condition, and awards nothing.
 */
export const MAX_CONSECUTIVE_MISFIRES = 3;

/** Below this trigger score the matcher reports `no_match`. */
export const MIN_SCORE = 1.0;

/**
 * Minimum gap between the top two trigger scores for a confident match. Inside
 * this margin, with equal `priority`, the matcher reports `ambiguous` rather
 * than coin-flipping on object key order.
 */
export const MARGIN = 1.0;

/** Dependency completion ratio that unlocks a dependent scenario (Stage 8). */
export const UNLOCK_THRESHOLD = 0.6;

/**
 * Default `minWords` for a `slot` mission condition, so a one-word grunt into a
 * `capture` node is not counted as achievement.
 */
export const DEFAULT_MIN_WORDS = 3;

/**
 * Entry state of every scenario graph. Already assumed by the Stage 2
 * validator's reachability walk; named here so the matcher, the fold, and the
 * reducer do not each carry their own string literal.
 */
export const START_STATE = 'start';

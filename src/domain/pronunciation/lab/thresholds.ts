/**
 * Pronunciation Lab — every cut-off the Lab uses (pronunciation-lab plan §5,
 * §7). One object, so a change to any number is one visible diff.
 *
 * Every number here is UNVALIDATED until the §7 calibration gate passes
 * (detection: ≥ 80 % of deliberate swaps land in Practise/Not heard;
 * fairness: ≤ 1 false "Practise" per 20 accented sentences). A threshold may
 * move to pass that gate; each move bumps LAB_THRESHOLDS_VERSION and updates
 * LAB_THRESHOLDS_HASH in the same commit (`__tests__/thresholds.test.ts`
 * fails until both change), and is logged in verification-log.md.
 *
 * Independent of every scoring version: the Lab never emits a mark, band or
 * grade, and nothing here can reach Learn or exam marking.
 */

export const LAB_THRESHOLDS = {
  /** §5.1 word states, on Azure's scripted per-word accuracy (0–100). */
  word: {
    /** Clear: accuracy at least this and not called `mispronounced`. */
    clearMin: 80,
    /** Almost: at least this. Below it (or `mispronounced`) is Practise. */
    almostMin: 60,
  },
  /** §5.1 fairness guards and §3.2 step 4. */
  focus: {
    /** At most this many focus words per take. */
    maxWords: 2,
    /** A word with fewer letters is never a focus word (à, a, y…). */
    minLetters: 2,
  },
  /** §5.2 "Your sounds" status, from Lab takes only. */
  family: {
    /** A family needs at least this many scored observations… */
    minObservations: 6,
    /** …on at least this many different days before it leaves "Not enough data yet". */
    minDays: 2,
    /** Only the most recent observations count, so old takes fade out. */
    recentObservations: 40,
    /** Mean accuracy of the recent observations. */
    clearMin: 80,
    gettingThereMin: 60,
  },
  /** Playing one word back from the learner's own recording. */
  clip: {
    /** Context kept either side of a word (same as the exam report's clips). */
    paddingS: 0.12,
    /** A clip shorter than this is widened evenly, so a short word is audible. */
    minDurationS: 0.3,
  },
  /** §3.1 item 3 / §3.2 step 1. */
  watchOut: {
    maxFeatures: 3,
  },
} as const;

/** Bump with any change to LAB_THRESHOLDS (and update the hash). */
export const LAB_THRESHOLDS_VERSION = 'pronunciation-lab-thresholds-v1';

/** sha256(JSON.stringify(LAB_THRESHOLDS)), pinned by `__tests__/thresholds.test.ts`. */
export const LAB_THRESHOLDS_HASH = '7d5184fed5b17c0c1048bcb5daa5017468e068eb83f3f95f21ef74efe79c8d0e';

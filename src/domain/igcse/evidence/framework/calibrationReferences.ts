/**
 * Phase 5 (§10.6) — the calibration-reference registry.
 *
 * A detector's mark-influence advances `forbidden → advisory → eligible` only
 * by the gated procedure in §10.6, and this file is the ledger that records
 * each advance. It is the mechanical half of "accelerate build, gate
 * influence": detectors ship in Phase 3 with `defaultMarkInfluence:
 * 'forbidden'`, and no amount of code availability alone can promote them —
 * promotion requires an entry here, which in turn requires a measured
 * correlation against teacher marks on a held-out set.
 *
 * Deliberately EMPTY. No validation corpus exists yet (CLAUDE.md constraint #5:
 * never assume validation data exists), so nothing is promotable today. The
 * empty list is the load-bearing assertion, not a placeholder: with no entries,
 * `resolveMarkInfluence` pins every detector to `forbidden` regardless of what
 * its `defaultMarkInfluence` claims, and `no-uncalibrated-influence.test.ts`
 * fails the build if anyone adds influence without adding a reference.
 *
 * Adding an entry is a validation event (roadmap S6/S9), not a code cleanup.
 * See §10.6 for the required bumps that accompany each tier of promotion:
 *   → advisory: add the field to the prompt allow-list + bump SCORING_PROMPT_VERSION.
 *               Marks are EXPECTED to move; that is validated, not a regression.
 *   → eligible: additionally requires a Cambridge-sourced or Phase-C-signed-off
 *               threshold + bumps to GUARDRAILS_VERSION and calibrationVersion.
 */

import type { MarkInfluence } from './observation';

/** The two promotable levels. `forbidden` is the default and needs no reference. */
export type PromotedInfluence = Exclude<MarkInfluence, 'forbidden'>;

export interface CalibrationReference {
  /** Detector id from the §10.3 registry table. */
  detectorId: string;
  /**
   * The detector version the correlation was measured against. Influence does
   * NOT carry across an output-changing detector edit — a version bump
   * invalidates the reference and drops the detector back to `forbidden`
   * until re-measured. This is what stops a promoted detector from silently
   * changing behaviour while keeping its licence to move marks.
   */
  detectorVersion: string;
  /** The level this reference authorises. */
  grantedInfluence: PromotedInfluence;
  /**
   * Where the correlation is recorded (validation run id / verification-log
   * entry). Free text, but must be non-empty — an unsourced promotion is
   * exactly what §10.6 exists to prevent.
   */
  calibrationReference: string;
  /**
   * For `eligible` only: the Cambridge source or Phase-C sign-off backing the
   * L3 threshold this detector is allowed to enforce (§10.6 step 4). Must be
   * absent for `advisory` grants, which do not touch L3 ceilings.
   */
  thresholdSource?: string;
}

/**
 * EMPTY BY DESIGN — see file header. Every detector is `forbidden` until a
 * validation phase (S6/S9) produces a measured correlation to record here.
 */
export const CALIBRATION_REFERENCES: readonly CalibrationReference[] = [];

/**
 * Look up the reference authorising influence for a detector at a specific
 * version. Returns undefined when the detector is unpromoted, or when it has a
 * reference recorded against a DIFFERENT version (stale reference → no grant).
 */
export function findCalibrationReference(
  detectorId: string,
  detectorVersion: string,
): CalibrationReference | undefined {
  return CALIBRATION_REFERENCES.find(
    (ref) => ref.detectorId === detectorId && ref.detectorVersion === detectorVersion,
  );
}

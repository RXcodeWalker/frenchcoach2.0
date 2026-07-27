/**
 * Phase 5 (§10.6) — the mark-influence resolver.
 *
 * This is the single choke point between "a detector exists and emits evidence"
 * and "a detector is allowed to move a mark". L1 observes; L3 decides
 * mark-influence — and it decides it by asking THIS module, never by reading
 * `detector.defaultMarkInfluence` directly.
 *
 * The distinction matters: `defaultMarkInfluence` is the detector author's
 * DECLARED intent, which is untrusted here. The EFFECTIVE influence is the
 * minimum of that declaration and what the calibration ledger authorises. So a
 * detector that ships claiming `eligible` without a calibration reference is
 * silently pinned to `forbidden` at runtime, and separately fails CI
 * (no-uncalibrated-influence.test.ts) so the mistake is loud rather than
 * merely harmless.
 *
 * Flipping a detector to `eligible` once calibrated is therefore a one-line
 * config change (add a CalibrationReference), not a rebuild — which is the
 * stated Phase 5 exit criterion.
 */

import { findCalibrationReference } from './calibrationReferences';
import type { Detector } from './detector';
import type { MarkInfluence } from './observation';

/**
 * The five pre-framework detectors (§10.3 footnote: "The five existing
 * detectors keep exactly their current influence ... No existing influence
 * changes in this redesign").
 *
 * These predate the calibration ledger: their advisory influence is already
 * live in shipped behaviour — `time-frame` is the advisory §3.4.1 prompt
 * signal, `parts` drives the two-part rule, and `counts`/`duration`/`fillers`
 * feed the L3 insufficient-evidence guardrail. Phase 5 must not silently
 * REVOKE influence any more than it may silently grant it, so they are
 * grandfathered explicitly here rather than exempted by a wildcard.
 *
 * This list is closed. It is capped at `advisory` (see MAX_GRANDFATHERED_
 * INFLUENCE): grandfathering preserves the status quo, it never authorises a
 * promotion to `eligible`, which always requires a sourced threshold (§10.6
 * step 4). No new detector may ever be added here — new detectors earn
 * influence through the ledger.
 */
export const GRANDFATHERED_ADVISORY_DETECTORS: readonly string[] = [
  'counts',
  'duration',
  'fillers',
  'parts',
  'time-frame',
];

const MAX_GRANDFATHERED_INFLUENCE: MarkInfluence = 'advisory';

const INFLUENCE_RANK: Record<MarkInfluence, number> = {
  forbidden: 0,
  advisory: 1,
  eligible: 2,
};

function minInfluence(a: MarkInfluence, b: MarkInfluence): MarkInfluence {
  return INFLUENCE_RANK[a] <= INFLUENCE_RANK[b] ? a : b;
}

export interface ResolvedInfluence {
  detectorId: string;
  detectorVersion: string;
  /** What the detector declared it wants. */
  declared: MarkInfluence;
  /** What it is actually permitted — `min(declared, authorised)`. */
  effective: MarkInfluence;
  /** Why `effective` is what it is. Surfaces in the L3 audit trail. */
  basis: 'default_forbidden' | 'grandfathered' | 'calibration_reference' | 'demoted_uncalibrated';
  /** The authorising reference, when one applies. */
  calibrationReference?: string;
}

/**
 * Resolve one detector's effective mark-influence.
 *
 * Precedence: a detector declaring `forbidden` stays forbidden (a ledger entry
 * cannot force influence onto a detector that disclaims it); otherwise the
 * declaration is capped by whatever the ledger — or the closed grandfather
 * list — authorises at this exact detector version.
 */
export function resolveMarkInfluence(detector: Detector): ResolvedInfluence {
  const declared = detector.defaultMarkInfluence;
  const base = {
    detectorId: detector.id,
    detectorVersion: detector.version,
    declared,
  };

  if (declared === 'forbidden') {
    return { ...base, effective: 'forbidden', basis: 'default_forbidden' };
  }

  const reference = findCalibrationReference(detector.id, detector.version);
  if (reference) {
    return {
      ...base,
      effective: minInfluence(declared, reference.grantedInfluence),
      basis: 'calibration_reference',
      calibrationReference: reference.calibrationReference,
    };
  }

  if (GRANDFATHERED_ADVISORY_DETECTORS.includes(detector.id)) {
    return {
      ...base,
      effective: minInfluence(declared, MAX_GRANDFATHERED_INFLUENCE),
      basis: 'grandfathered',
    };
  }

  // Declared influence with no authorisation → pinned to forbidden at runtime.
  return { ...base, effective: 'forbidden', basis: 'demoted_uncalibrated' };
}

/** Resolve a whole fleet, in registry order. */
export function resolveFleetInfluence(detectors: readonly Detector[]): ResolvedInfluence[] {
  return detectors.map(resolveMarkInfluence);
}

/**
 * The L3 read model: detector ids whose observations may legitimately CAP a
 * mark. `advisory` deliberately does not qualify — advisory signals inform the
 * L2 prompt (via the allow-list) but never clamp deterministically.
 */
export function markEligibleDetectorIds(detectors: readonly Detector[]): string[] {
  return resolveFleetInfluence(detectors)
    .filter((resolved) => resolved.effective === 'eligible')
    .map((resolved) => resolved.detectorId);
}

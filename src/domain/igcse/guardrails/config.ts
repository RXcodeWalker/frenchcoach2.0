/**
 * Guardrail thresholds — UNVALIDATED starting values, to be tuned once a
 * calibration corpus exists (see docs/systems/assessment-engine.md). Editing
 * any threshold here requires bumping GUARDRAILS_VERSION (enforced by
 * __tests__/version-pin.test.ts, which hashes this config together with
 * guardrail output).
 */

import type { EvidenceCeiling, InsufficientEvidenceDurationConfig } from './types';

// UNVALIDATED — starting values, to be tuned once a calibration corpus exists.
export const DEFAULT_DURATION_CONFIG: InsufficientEvidenceDurationConfig = {
  minCombinedDurationS: 240,
  minCombinedWordCount: 200,
};

/**
 * Phase 5 (§10.6) — the evidence-ceiling registry: the ONLY place an L1 signal
 * is allowed to cap an L2 mark, and the only place such a numeric threshold may
 * live.
 *
 * EMPTY BY DESIGN. A ceiling may be added only once its detector reaches
 * `eligible` in the calibration ledger (§10.6 step 4), which itself requires a
 * Cambridge-sourced or Phase-C-signed-off threshold. Since
 * CALIBRATION_REFERENCES is empty, no detector is eligible, so no ceiling can
 * legitimately be added yet — CLAUDE.md constraint #2 (never invent a Cambridge
 * number) makes inventing one here a hard error, not a judgement call.
 *
 * With this list empty, `runGuardrails` remains advisory-only: it reports
 * triggers and never clamps a mark. Populating one entry is what turns the
 * clamp on, versioned — hence "one-line config change, not a rebuild".
 *
 * `no-uncalibrated-influence.test.ts` enforces that every entry here names a
 * detector resolved to `eligible` AND carries a `thresholdSource`.
 */
export const EVIDENCE_CEILINGS: readonly EvidenceCeiling[] = [];

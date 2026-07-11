/**
 * S5 guardrail thresholds — UNVALIDATED starting values, tuned in Phase A
 * (roadmap S6). Editing any threshold here requires bumping GUARDRAILS_VERSION
 * (enforced by __tests__/version-pin.test.ts, which hashes this config
 * together with guardrail output).
 */

import type { InsufficientEvidenceDurationConfig } from './types';

// UNVALIDATED — starting values, tuned in Phase A (roadmap S6).
export const DEFAULT_DURATION_CONFIG: InsufficientEvidenceDurationConfig = {
  minCombinedDurationS: 240,
  minCombinedWordCount: 200,
};

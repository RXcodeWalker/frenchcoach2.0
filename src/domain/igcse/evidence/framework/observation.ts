/**
 * Phase 0 detector framework — canonical Observation/DetectorRun shapes.
 * See i-am-building-an-cosmic-cascade.md §10.1. No detectors emit Observations
 * yet in Phase 0 (the 5 existing detectors are wrapped byte-identically); this
 * file exists so the registry/runner contract is fixed before Phase 3 adds
 * detectors that use it.
 */

export const OBSERVATION_SCHEMA_VERSION = 'observation-v1';

export type DetectorTier = 0 | 1 | 2;

export type MarkInfluence = 'forbidden' | 'advisory' | 'eligible';

/** Offsets into the canonical candidate text this observation cites. */
export interface Span {
  startOffset: number;
  endOffset: number;
}

/**
 * ObservationType is intentionally unconstrained (string) in Phase 0 — no
 * detector produces typed observations yet. Phase 3 introduces the enum of
 * concrete types (tense_detected, agreement_gender, ...) per §10.3.
 */
export type ObservationType = string;

export interface Observation {
  /** sha256 of the composite identity key (§9.2) — never random/time-based. */
  observationId: string;
  detectorId: string;
  detectorVersion: string;
  type: ObservationType;
  /** Canonical, JSON-stable. */
  value: string | number | boolean;
  /** At least one span; whole-response aggregates use the full-response span. */
  spans: Span[];
  /** 0..1, detector-declared. */
  confidence: number;
  markInfluence: MarkInfluence;
  /** Resolved via the observationType → skillNodeId map; null = feature-only. */
  skillNodeId: string | null;
}

export type DetectorRunState =
  | 'success'
  | 'disabled'
  | 'dependency_unavailable'
  | 'version_mismatch'
  | 'failed';

export interface DetectorRun {
  detectorId: string;
  version: string;
  state: DetectorRunState;
  /** Content-derived only (error class + message); never a stack or timestamp. */
  reason?: string;
}

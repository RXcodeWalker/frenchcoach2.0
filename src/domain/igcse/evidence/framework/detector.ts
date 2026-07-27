/**
 * Phase 0 detector contract. See §10.1 and §9.1 (tier-DAG dependency rules).
 */

import type { SpeakingTranscript } from '../../judgement/types';
import type { SessionQuestionSet } from '../../session/types';
import type { DetectorTier, MarkInfluence, Observation, ObservationType } from './observation';

export interface DetectorContext {
  /** Full, rich input — not the lossy projection. */
  transcript: SpeakingTranscript;
  /**
   * Not available at every Phase-0 call site (buildEvidenceSubset takes only
   * a transcript). Optional here; Phase 1 wires the rich SessionTranscript +
   * question set into L1 directly and this becomes load-bearing.
   */
  questionSet: SessionQuestionSet | null;
  /** Observations from strictly-lower tiers only. */
  evidenceView: ReadonlyMap<string, Observation[]>;
}

export interface Detector {
  id: string;
  /** Bump on any output-changing edit. */
  version: string;
  tier: DetectorTier;
  /** Detector ids; every entry must be strictly lower tier (§9.1). */
  dependsOn: string[];
  produces: ObservationType[];
  /** 0..1 prior (§10.2). */
  baseConfidence: number;
  /** New detectors default to 'forbidden'. */
  defaultMarkInfluence: MarkInfluence;
  /** Pure; throws only on genuine defect. */
  run(ctx: DetectorContext): Observation[];
}

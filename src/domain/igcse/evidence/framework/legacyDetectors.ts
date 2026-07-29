/**
 * Phase 0 — wraps the 5 pre-framework detectors (counts, duration, fillers,
 * parts, time-frame) onto the Detector contract for registry/runner
 * bookkeeping (§10.7 Phase 0: "no new signals").
 *
 * These detectors do not yet emit typed Observations — the legacy evidence
 * shapes (ResponseCountEvidence, etc.) predate the Observation model, and
 * porting their facts onto Observation is a Phase-3 concern (new detector
 * ids in §10.3, e.g. `counts`/`duration`/`fillers`/`parts`/`time-frame`
 * rows). Phase 0's job is byte-identical output, so `run()` returns `[]`.
 *
 * E3 (§10.7 hygiene pass): `run()` no longer recomputes the underlying pure
 * function — `buildEvidence.ts::computeSubsetFields` is the single place that
 * calls it for the real evidence values. A throwing pure function would throw
 * again inside `computeSubsetFields` immediately after this bookkeeping-only
 * run, so nothing is lost by not calling it here too.
 */

import type { Detector } from './detector';

export const countsDetector: Detector = {
  id: 'counts',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['response_count'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'advisory',
  run() {
    return [];
  },
};

export const durationDetector: Detector = {
  id: 'duration',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['topic_duration'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'advisory',
  run() {
    return [];
  },
};

export const fillersDetector: Detector = {
  id: 'fillers',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['filler'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'advisory',
  run() {
    return [];
  },
};

export const partsDetector: Detector = {
  id: 'parts',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['role_play_part'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'advisory',
  run() {
    return [];
  },
};

export const timeFrameDetector: Detector = {
  id: 'time-frame',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['time_frame_alignment'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'advisory',
  run() {
    return [];
  },
};

export const LEGACY_DETECTORS: Detector[] = [
  countsDetector,
  durationDetector,
  fillersDetector,
  partsDetector,
  timeFrameDetector,
];

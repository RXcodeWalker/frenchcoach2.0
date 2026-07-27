/**
 * Tier-2 `avoidance` detector (§10.3): re-homed from
 * `diagnosticEngine.detectAvoidance` (Resolved Decisions §2 — "re-homed as an
 * L1 detector in Phase 3", not deleted). The legacy function takes the
 * app-level `Question` type and a whole transcript string; this detector
 * captures the same underlying idea natively against the L1 Observation
 * stream it now has available: a candidate who produces zero `tense_detected`
 * observations of a given time frame across an entire response set, despite
 * substantial output (avoiding the L1 evidenceView word-count proxy), is
 * avoiding that construction rather than attempting and failing it — a
 * distinct signal from `tense_missing` (single no-verb utterance) worth
 * surfacing to coaching. Depends on `tense`, `coverage`, `counts` (Tier 1).
 */

import type { Detector } from '../framework/detector';
import { fullResponseSpan, buildCanonicalUnits, computeObservationId } from '../framework/text';
import type { Observation } from '../framework/observation';

const MIN_WORD_COUNT_FOR_AVOIDANCE_ANALYSIS = 40;

export const avoidanceDetector: Detector = {
  id: 'avoidance',
  version: '1',
  tier: 2,
  dependsOn: ['tense', 'coverage', 'counts'],
  produces: ['avoidance'],
  baseConfidence: 0.5,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const totalWords = units.reduce((sum, u) => sum + u.text.trim().split(/\s+/).filter(Boolean).length, 0);
    if (totalWords < MIN_WORD_COUNT_FOR_AVOIDANCE_ANALYSIS) return [];

    const tenseObservations = ctx.evidenceView.get('tense') ?? [];
    const detectedTimeFrames = new Set(
      tenseObservations
        .filter((o) => o.type === 'tense_detected')
        .map((o) => String(o.value).split(':')[0]),
    );

    const observations: Observation[] = [];
    const span = fullResponseSpan(units);

    // Past tense is the highest-value, highest-confidence avoidance signal at
    // 0520 (Extended candidates are expected to reach for passé composé /
    // imparfait even when not explicitly cued) — flagged only when entirely
    // absent across a substantial response.
    if (!detectedTimeFrames.has('past')) {
      observations.push({
        observationId: computeObservationId('avoidance', '1', 'avoidance', span, 'tense_past'),
        detectorId: 'avoidance',
        detectorVersion: '1',
        type: 'avoidance',
        value: 'tense_past',
        spans: span,
        confidence: 0.5,
        markInfluence: 'forbidden',
        skillNodeId: 'tense_past',
      });
    }

    if (!detectedTimeFrames.has('future') && !detectedTimeFrames.has('conditional')) {
      observations.push({
        observationId: computeObservationId('avoidance', '1', 'avoidance', span, 'tense_future'),
        detectorId: 'avoidance',
        detectorVersion: '1',
        type: 'avoidance',
        value: 'tense_future',
        spans: span,
        confidence: 0.5,
        markInfluence: 'forbidden',
        skillNodeId: 'tense_future',
      });
    }

    return observations;
  },
};

/**
 * Tier-2 `tense-consistency` detector (§10.3): tense consistency within a
 * question — dominant frame vs outliers. Consumes `tense` (Tier 1). Per
 * question/task unit, if 2+ distinct time frames are detected and neither is
 * a clear majority (the minority frame is not a rare singleton relative to
 * the dominant one), emits a `tense_inconsistent` observation. Report-only
 * (L2 judges genuine ambiguity vs deliberate frame-mixing, per Part 2).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, fullUnitSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

export const tenseConsistencyDetector: Detector = {
  id: 'tense-consistency',
  version: '1',
  tier: 2,
  dependsOn: ['tense'],
  produces: ['tense_inconsistent'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const tenseObservations = ctx.evidenceView.get('tense') ?? [];
    const observations: Observation[] = [];

    for (const unit of units) {
      const inUnit = tenseObservations.filter(
        (o) =>
          o.type === 'tense_detected' &&
          o.spans[0] &&
          o.spans[0].startOffset >= unit.startOffset &&
          o.spans[0].endOffset <= unit.startOffset + unit.text.length,
      );
      if (inUnit.length < 2) continue;

      const counts = new Map<string, number>();
      for (const obs of inUnit) {
        const timeFrame = String(obs.value).split(':')[0];
        counts.set(timeFrame, (counts.get(timeFrame) ?? 0) + 1);
      }
      if (counts.size < 2) continue;

      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const [dominantFrame, dominantCount] = sorted[0];
      const [, secondCount] = sorted[1];

      // Not inconsistent if the minority is a rare singleton against a clear
      // majority (e.g. 4 past + 1 stray present participle-lookalike).
      if (secondCount === 1 && dominantCount >= 3) continue;

      const value = `${dominantFrame}:${sorted.map(([f, c]) => `${f}=${c}`).join(',')}`;
      const span = fullUnitSpan(unit);
      observations.push({
        observationId: computeObservationId('tense-consistency', '1', 'tense_inconsistent', span, value),
        detectorId: 'tense-consistency',
        detectorVersion: '1',
        type: 'tense_inconsistent',
        value,
        spans: span,
        confidence: 0.7,
        markInfluence: 'forbidden',
        skillNodeId: null,
      });
    }

    return observations;
  },
};

/**
 * Tier-0 `segment` detector (§10.3): sentence segmentation. Splits each
 * response unit's text on terminal punctuation (. ! ? and ellipsis), emitting
 * one `sentence` observation per non-empty segment. Feature-only
 * (skillNodeId: null) — consumed by `complexity` (Tier 1) and `self-correction`
 * (Tier 1).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, nthExactOccurrenceSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

const SENTENCE_SPLIT = /(?<=[.!?…])\s+|\n+/;

export interface SentenceSegment {
  unitId: string;
  text: string;
}

export function segmentSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const segmentDetector: Detector = {
  id: 'segment',
  version: '1',
  tier: 0,
  dependsOn: [],
  produces: ['sentence'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const sentences = segmentSentences(unit.text);
      const seenCount = new Map<string, number>();

      for (const sentence of sentences) {
        const occurrence = seenCount.get(sentence) ?? 0;
        seenCount.set(sentence, occurrence + 1);
        const span = nthExactOccurrenceSpan(unit, sentence, occurrence);
        observations.push({
          observationId: computeObservationId('segment', '1', 'sentence', span, sentence),
          detectorId: 'segment',
          detectorVersion: '1',
          type: 'sentence',
          value: sentence,
          spans: span,
          confidence: 0.9,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
      }
    }

    return observations;
  },
};

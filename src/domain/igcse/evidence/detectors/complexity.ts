/**
 * Tier-1 `complexity` detector (§10.3): simple vs complex sentence ratio.
 * Consumes `segment` (Tier 0). A sentence is "complex" if it contains a
 * subordinating conjunction or relative pronoun (parce que, quand, que, qui,
 * si, comme, lorsque, puisque, bien que, dont, où) — the standard clause-
 * combining markers a 0520 candidate is expected to reach for at Extended
 * level.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, normalize, nthExactOccurrenceSpan } from '../framework/text';
import type { Observation } from '../framework/observation';
import { segmentSentences } from './segment';

const SUBORDINATORS = [
  'parce que',
  'parce qu',
  'quand',
  'que',
  'qu',
  'qui',
  'si',
  'comme',
  'lorsque',
  'lorsqu',
  'puisque',
  'puisqu',
  'bien que',
  'bien qu',
  'dont',
  'ou',
  'car',
];

function isComplex(sentence: string): boolean {
  const normalized = normalize(sentence);
  const words = normalized.split(' ').filter(Boolean);
  return SUBORDINATORS.some((marker) => {
    const markerWords = marker.split(' ');
    for (let i = 0; i <= words.length - markerWords.length; i += 1) {
      if (markerWords.every((w, j) => words[i + j] === w)) return true;
    }
    return false;
  });
}

export const complexityDetector: Detector = {
  id: 'complexity',
  version: '1',
  tier: 1,
  dependsOn: ['segment'],
  produces: ['complex_sentence'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const sentences = segmentSentences(unit.text);
      const seenCount = new Map<string, number>();
      for (const sentence of sentences) {
        const complex = isComplex(sentence);
        const occurrence = seenCount.get(sentence) ?? 0;
        seenCount.set(sentence, occurrence + 1);
        const span = nthExactOccurrenceSpan(unit, sentence, occurrence);
        observations.push({
          observationId: computeObservationId('complexity', '1', 'complex_sentence', span, complex),
          detectorId: 'complexity',
          detectorVersion: '1',
          type: 'complex_sentence',
          value: complex,
          spans: span,
          confidence: 0.7,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
      }
    }

    return observations;
  },
};

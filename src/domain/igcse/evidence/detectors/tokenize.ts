/**
 * Tier-0 `tokenize` detector (§10.3): word-level tokenisation, normalised
 * (accents stripped, lowercased). Emits one `lexeme` observation per token
 * occurrence. Feature-only (skillNodeId: null) — the shared substrate for
 * every lexical/morphological Tier-1 detector.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';

export const tokenizeDetector: Detector = {
  id: 'tokenize',
  version: '1',
  tier: 0,
  dependsOn: [],
  produces: ['lexeme'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      const words = normalized.split(' ').filter(Boolean);
      // Occurrence index disambiguates repeated tokens within the same unit
      // (§9.2 set-not-bag: distinct occurrences must get distinct composite keys).
      const seenCount = new Map<string, number>();

      for (const word of words) {
        const occurrence = seenCount.get(word) ?? 0;
        seenCount.set(word, occurrence + 1);
        const span = findNormalizedOccurrenceSpan(unit, word, occurrence);
        observations.push({
          observationId: computeObservationId('tokenize', '1', 'lexeme', span, word),
          detectorId: 'tokenize',
          detectorVersion: '1',
          type: 'lexeme',
          value: word,
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

/**
 * Tier-1 `self-correction` detector (§10.3): repair/self-correction count.
 * Report-only, never penalised — per Part 2 "reward achievement": a candidate
 * catching and fixing their own error is a positive fluency signal. Detects
 * the spoken-French repair marker pattern "X, euh, Y" / "X... non, Y" /
 * "je veux dire" within a sentence (consumes `segment`).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, nthExactOccurrenceSpan } from '../framework/text';
import type { Observation } from '../framework/observation';
import { segmentSentences } from './segment';

const REPAIR_MARKERS = /\b(euh|je veux dire|plutôt|plutot|pardon|excusez[- ]moi|non attends|je me corrige)\b/i;

export const selfCorrectionDetector: Detector = {
  id: 'self-correction',
  version: '1',
  tier: 1,
  dependsOn: ['segment'],
  produces: ['self_correction'],
  baseConfidence: 0.7,
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
        const match = sentence.match(REPAIR_MARKERS);
        if (!match) continue;
        const span = nthExactOccurrenceSpan(unit, sentence, occurrence);
        observations.push({
          observationId: computeObservationId('self-correction', '1', 'self_correction', span, sentence),
          detectorId: 'self-correction',
          detectorVersion: '1',
          type: 'self_correction',
          value: sentence,
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

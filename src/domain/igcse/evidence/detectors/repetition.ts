/**
 * Tier-1 `repetition` detector (§10.3): lexical monotony — a content word
 * (>= 4 chars, excluding the ultra-high-frequency subject pronouns/aux/aller
 * forms already carved out elsewhere) repeated 3+ times across the whole
 * transcript. Emits one `repetition` observation per over-used lemma, citing
 * the full-response span (a whole-transcript aggregate per §10.1 span rule),
 * with `value` = the repeated word and count encoded for disambiguation.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, fullResponseSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';

const EXCLUDED = new Set([
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'et', 'que', 'qui', 'qu', 'pour', 'avec', 'dans', 'sur',
  'ai', 'as', 'avons', 'avez', 'ont', 'suis', 'es', 'est', 'sommes', 'etes', 'sont',
  'vais', 'vas', 'va', 'allons', 'allez', 'vont', 'tres', 'bien', 'aussi',
]);

const REPETITION_THRESHOLD = 3;

export const repetitionDetector: Detector = {
  id: 'repetition',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['repetition'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const counts = new Map<string, number>();

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      for (const word of normalized.split(' ').filter(Boolean)) {
        if (word.length < 4 || EXCLUDED.has(word)) continue;
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }

    const observations: Observation[] = [];
    const span = fullResponseSpan(units);

    for (const [word, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (count < REPETITION_THRESHOLD) continue;
      const value = `${word}:${count}`;
      observations.push({
        observationId: computeObservationId('repetition', '1', 'repetition', span, value),
        detectorId: 'repetition',
        detectorVersion: '1',
        type: 'repetition',
        value,
        spans: span,
        confidence: 0.9,
        markInfluence: 'forbidden',
        skillNodeId: null,
      });
    }

    return observations;
  },
};

/**
 * Tier-1 `connectors` detector (§10.3): connector/discourse-marker inventory
 * and variety. High-confidence, low-FP — a curated closed list of French
 * discourse markers examiners reward at 0520 (d'abord, ensuite, enfin,
 * cependant, en revanche, à mon avis, donc, alors, par contre...).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';

const CONNECTORS = [
  "d'abord",
  'd abord',
  'ensuite',
  'puis',
  'enfin',
  'finalement',
  'cependant',
  'en revanche',
  'par contre',
  'donc',
  'alors',
  'de plus',
  'en plus',
  'par ailleurs',
  'a mon avis',
  'selon moi',
  'je pense que',
  'je trouve que',
  'en conclusion',
  'pour conclure',
  'malgre',
  'bien que',
  'bien qu',
  'car',
  'parce que',
  'parce qu',
];

export const connectorsDetector: Detector = {
  id: 'connectors',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['connector_used'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;

      for (const connector of CONNECTORS) {
        // Count occurrences in the normalized text (word-boundary safe:
        // "car" must not match inside "carotte") to know how many times to
        // ask findNormalizedOccurrenceSpan for a fresh, correctly-offset span.
        const needle = connector.replace(/'/g, ' ').trim();
        let occurrences = 0;
        let searchFrom = 0;
        for (;;) {
          const idx = normalized.indexOf(needle, searchFrom);
          if (idx === -1) break;
          const before = normalized[idx - 1];
          const after = normalized[idx + needle.length];
          searchFrom = idx + needle.length;
          if (before !== undefined && before !== ' ') continue;
          if (after !== undefined && after !== ' ') continue;
          occurrences += 1;
        }

        for (let occurrence = 0; occurrence < occurrences; occurrence += 1) {
          const span = findNormalizedOccurrenceSpan(unit, needle, occurrence);
          observations.push({
            observationId: computeObservationId(
              'connectors',
              '1',
              'connector_used',
              span,
              `${connector}@${occurrence}`,
            ),
            detectorId: 'connectors',
            detectorVersion: '1',
            type: 'connector_used',
            value: connector,
            spans: span,
            confidence: 0.9,
            markInfluence: 'forbidden',
            skillNodeId: null,
          });
        }
      }
    }

    return observations;
  },
};

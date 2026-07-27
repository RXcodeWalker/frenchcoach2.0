/**
 * Tier-1 `prepositions` detector (§10.3): preposition/verb government for a
 * curated set of known verbs (jouer à/de, écouter/chercher/attendre with no
 * preposition). Migrates legacy coachService prep_jouer/prep_ecouter_a rules.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, matchIndexSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

const RULES: RegExp[] = [
  /\bjouer (le|la|les|un|une) (foot|football|tennis|basket|rugby|badminton|volley)\b/gi,
  // No \b touching écouter/à: JS's \b is ASCII-\w-only, so \bécouter and à\b
  // never match (é/à are not \w characters) — lookbehind/lookahead on a
  // space or string edge is the correct boundary instead.
  /(?<=^| )(écouter|ecouter|chercher|attendre) (à|a|pour)(?=$| )/gi,
];

export const prepositionsDetector: Detector = {
  id: 'prepositions',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['preposition_error'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      for (const pattern of RULES) {
        const matches = unit.text.matchAll(new RegExp(pattern.source, pattern.flags));
        for (const match of matches) {
          const value = match[0];
          const span = matchIndexSpan(unit, match.index, value);
          observations.push({
            observationId: computeObservationId('prepositions', '1', 'preposition_error', span, value),
            detectorId: 'prepositions',
            detectorVersion: '1',
            type: 'preposition_error',
            value,
            spans: span,
            confidence: 0.7,
            markInfluence: 'forbidden',
            skillNodeId: null,
          });
        }
      }
    }

    return observations;
  },
};

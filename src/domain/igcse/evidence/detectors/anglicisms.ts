/**
 * Tier-1 `anglicisms` detector (§10.3): curated anglicism/calque list — direct
 * English-pattern translations that read fluently to an anglophone but are
 * wrong French (je suis 15 ans -> j'ai 15 ans; je suis faim -> j'ai faim; la
 * librairie for "library"). Migrates legacy coachService ang_age/ang_faim_soif
 * rules plus the classic librairie/library false friend.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, matchIndexSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

const RULES: RegExp[] = [
  /\bje suis \d+ ans?\b/gi,
  /\b(je|tu|il|elle|on|nous|vous|ils|elles) (suis|es|est|sommes|êtes|etes|sont) (faim|soif|chaud|froid|peur|raison|sommeil)\b/gi,
  /\bla librairie\b/gi,
];

export const anglicismsDetector: Detector = {
  id: 'anglicisms',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['anglicism'],
  baseConfidence: 0.9,
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
            observationId: computeObservationId('anglicisms', '1', 'anglicism', span, value),
            detectorId: 'anglicisms',
            detectorVersion: '1',
            type: 'anglicism',
            value,
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

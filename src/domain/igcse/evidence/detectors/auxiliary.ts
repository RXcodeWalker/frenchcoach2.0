/**
 * Tier-1 `aux` detector (§10.3): auxiliary choice (être vs avoir) for passé
 * composé. Migrates the legacy coachService aux_aller/aux_venir pattern
 * ("j'ai allé"/"j'ai venu" — DR MRS VANDERTRAMP movement verbs require être,
 * not avoir) generalised to a curated être-verb participle list.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';

/** DR MRS VANDERTRAMP participles that require être, keyed by the wrong-auxiliary participle form actually said. */
const ETRE_VERB_PARTICIPLES = new Set([
  'alle',
  'allee',
  'allees',
  'venu',
  'venue',
  'venues',
  'venus',
  'arrive',
  'arrivee',
  'arrivees',
  'arrives',
  'parti',
  'partie',
  'parties',
  'partis',
  'entre',
  'entree',
  'entrees',
  'entres',
  'sorti',
  'sortie',
  'sorties',
  'sortis',
  'monte',
  'montee',
  'montees',
  'montes',
  'descendu',
  'descendue',
  'descendues',
  'descendus',
  'reste',
  'restee',
  'restees',
  'restes',
  'tombe',
  'tombee',
  'tombees',
  'tombes',
  'ne',
  'nee',
  'nees',
  'nes',
  'mort',
  'morte',
  'mortes',
  'morts',
]);

const AVOIR_FORMS = new Set(['ai', 'as', 'a', 'avons', 'avez', 'ont']);

export const auxDetector: Detector = {
  id: 'aux',
  version: '1',
  tier: 1,
  dependsOn: ['tag-verbs'],
  produces: ['auxiliary_error'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      const words = normalized.split(' ').filter(Boolean);

      const seenCount = new Map<string, number>();

      for (let i = 0; i < words.length - 1; i += 1) {
        const aux = words[i];
        const participle = words[i + 1];
        if (AVOIR_FORMS.has(aux) && ETRE_VERB_PARTICIPLES.has(participle)) {
          const value = `${aux} ${participle}`;
          const occurrence = seenCount.get(value) ?? 0;
          seenCount.set(value, occurrence + 1);
          const span = findNormalizedOccurrenceSpan(unit, value, occurrence);
          observations.push({
            observationId: computeObservationId('aux', '1', 'auxiliary_error', span, value),
            detectorId: 'aux',
            detectorVersion: '1',
            type: 'auxiliary_error',
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

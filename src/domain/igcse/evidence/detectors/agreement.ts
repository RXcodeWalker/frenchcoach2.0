/**
 * Tier-1 `agreement` detector (§10.3): subject-verb (number) and
 * adjective-noun (gender) agreement, high-frequency cases only per Part 2
 * ("confident cases only" / "high-freq nouns only" — a curated lexicon, not a
 * full morphological analyser, to keep false positives low). Confidence is
 * lowered per-observation for lower-certainty matches (§10.2).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';

/** Curated feminine nouns commonly misgendered by anglophone learners (masculine article used in error). */
const FEMININE_NOUNS = new Set([
  'maison',
  'voiture',
  'ecole',
  'ville',
  'famille',
  'chose',
  'vie',
  'journee',
  'semaine',
  'annee',
  'region',
  'nation',
  'television',
  'question',
]);

/** Curated masculine nouns commonly misgendered (feminine article used in error). */
const MASCULINE_NOUNS = new Set([
  'probleme',
  'film',
  'sport',
  'voyage',
  'travail',
  'weekend',
  'week end',
  'restaurant',
  'college',
  'lycee',
  'musee',
  'dimanche',
]);

const MASCULINE_ARTICLES = new Set(['le', 'un', 'ce', 'du']);
const FEMININE_ARTICLES = new Set(['la', 'une', 'cette']);

/** Singular 3rd-person subjects, for a narrow number-agreement check (see below). */
const SINGULAR_THIRD_SUBJECTS = new Set(['il', 'elle', 'on']);

export const agreementDetector: Detector = {
  id: 'agreement',
  version: '1',
  tier: 1,
  dependsOn: ['tag-verbs', 'tokenize'],
  produces: ['agreement_gender', 'agreement_number'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      const words = normalized.split(' ').filter(Boolean);
      // Keyed by "type:value" — gender and number checks share the bigram
      // vocabulary space but are tracked as separate occurrence sequences
      // (§9.2 set-not-bag applies per detector-emitted composite key, which
      // already includes type, so this only needs to disambiguate repeats
      // of the same type+value pair).
      const seenCount = new Map<string, number>();

      for (let i = 0; i < words.length - 1; i += 1) {
        const article = words[i];
        const noun = words[i + 1];

        if (MASCULINE_ARTICLES.has(article) && FEMININE_NOUNS.has(noun)) {
          const value = `${article} ${noun}`;
          const key = `agreement_gender:${value}`;
          const occurrence = seenCount.get(key) ?? 0;
          seenCount.set(key, occurrence + 1);
          const span = findNormalizedOccurrenceSpan(unit, value, occurrence);
          observations.push({
            observationId: computeObservationId('agreement', '1', 'agreement_gender', span, value),
            detectorId: 'agreement',
            detectorVersion: '1',
            type: 'agreement_gender',
            value,
            spans: span,
            confidence: 0.7,
            markInfluence: 'forbidden',
            skillNodeId: null,
          });
        }

        if (FEMININE_ARTICLES.has(article) && MASCULINE_NOUNS.has(noun)) {
          const value = `${article} ${noun}`;
          const key = `agreement_gender:${value}`;
          const occurrence = seenCount.get(key) ?? 0;
          seenCount.set(key, occurrence + 1);
          const span = findNormalizedOccurrenceSpan(unit, value, occurrence);
          observations.push({
            observationId: computeObservationId('agreement', '1', 'agreement_gender', span, value),
            detectorId: 'agreement',
            detectorVersion: '1',
            type: 'agreement_gender',
            value,
            spans: span,
            confidence: 0.7,
            markInfluence: 'forbidden',
            skillNodeId: null,
          });
        }

        // Number agreement: plural subject immediately followed by a singular
        // "-e/-es/-ont"-less present ending is out of scope for a low-FP
        // regex check, so we only flag the narrow, high-confidence case of a
        // singular-3rd-person subject followed by a verb ending in "-ent"
        // (a plural ending on a singular subject).
        if (SINGULAR_THIRD_SUBJECTS.has(article) && /ent$/.test(noun) && noun.length > 4) {
          const value = `${article} ${noun}`;
          const key = `agreement_number:${value}`;
          const occurrence = seenCount.get(key) ?? 0;
          seenCount.set(key, occurrence + 1);
          const span = findNormalizedOccurrenceSpan(unit, value, occurrence);
          observations.push({
            observationId: computeObservationId('agreement', '1', 'agreement_number', span, value),
            detectorId: 'agreement',
            detectorVersion: '1',
            type: 'agreement_number',
            value,
            spans: span,
            confidence: 0.5,
            markInfluence: 'forbidden',
            skillNodeId: null,
          });
        }
      }
    }

    return observations;
  },
};

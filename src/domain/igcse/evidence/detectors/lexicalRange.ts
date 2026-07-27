/**
 * Tier-1 `lexical-range` detector (§10.3): vocabulary sophistication vs a
 * curated A1/A2 base-list proxy. Emits `lexeme_rare` for content words NOT in
 * the curated base list (a B1-reach proxy per Part 2) — function words,
 * numbers, and proper nouns are excluded from consideration entirely so the
 * signal only ever fires on genuine open-class vocabulary choices.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, normalize, spanWithinUnit } from '../framework/text';
import type { Observation } from '../framework/observation';

/** Closed-class / ultra-high-frequency function words — never "rare", excluded from consideration. */
const FUNCTION_WORDS = new Set([
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'qu',
  'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'a', 'ai', 'as', 'avons', 'avez', 'ont', 'suis', 'es', 'est', 'sommes', 'etes', 'sont',
  'vais', 'vas', 'va', 'allons', 'allez', 'vont',
  'ne', 'pas', 'plus', 'jamais', 'rien', 'tres', 'bien', 'bon', 'bonne',
  'pour', 'avec', 'sans', 'dans', 'sur', 'sous', 'entre', 'chez',
  'oui', 'non', 'euh', 'alors', 'aussi', 'comme', 'si',
]);

/**
 * Curated A1/A2 base vocabulary — common topics for 0520 candidates. Not
 * "rare" if matched. Includes common conjugated forms of the base verbs
 * (not just infinitives) since this is a surface-form proxy list, not a
 * lemmatiser — a candidate saying "j'aime" should not be flagged just
 * because only "aimer" was listed.
 */
const BASE_LIST = new Set([
  'maison', 'famille', 'ecole', 'ami', 'amie', 'amis', 'travail', 'sport', 'film',
  'musique', 'livre',
  'manger', 'mange', 'manges', 'mangeons', 'mangez', 'mangent',
  'boire', 'bois', 'boit', 'buvons', 'buvez', 'boivent',
  'jouer', 'joue', 'joues', 'jouons', 'jouez', 'jouent',
  'regarder', 'regarde', 'regardes', 'regardons', 'regardez', 'regardent',
  'aimer', 'aime', 'aimes', 'aimons', 'aimez', 'aiment',
  'adorer', 'adore', 'adores', 'adorons', 'adorez', 'adorent',
  'detester', 'deteste', 'detestes', 'detestons', 'detestez', 'detestent',
  'habiter', 'habite', 'habites', 'habitons', 'habitez', 'habitent',
  'etudier', 'etudie', 'etudies', 'etudions', 'etudiez', 'etudient',
  'voyager', 'voyage', 'voyages', 'voyageons', 'voyagez', 'voyagent',
  'ville', 'pays', 'weekend', 'vacances',
  'restaurant', 'magasin', 'argent', 'temps', 'jour', 'semaine', 'annee', 'matin', 'soir',
  'content', 'heureux', 'triste', 'fatigue', 'grand', 'petit', 'nouveau', 'vieux',
  'chien', 'chat', 'frere', 'soeur', 'pere', 'mere', 'parent', 'enfant',
  'foot', 'football', 'tennis', 'natation', 'cinema', 'television', 'internet', 'telephone',
]);

function isConsiderable(word: string): boolean {
  return word.length >= 4 && !FUNCTION_WORDS.has(word) && !/^\d+$/.test(word);
}

export const lexicalRangeDetector: Detector = {
  id: 'lexical-range',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['lexeme_rare'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      const words = normalized.split(' ').filter(Boolean);
      const seen = new Set<string>();

      for (const word of words) {
        if (!isConsiderable(word) || BASE_LIST.has(word) || seen.has(word)) continue;
        seen.add(word);
        const span = spanWithinUnit(unit, word);
        observations.push({
          observationId: computeObservationId('lexical-range', '1', 'lexeme_rare', span, word),
          detectorId: 'lexical-range',
          detectorVersion: '1',
          type: 'lexeme_rare',
          value: word,
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

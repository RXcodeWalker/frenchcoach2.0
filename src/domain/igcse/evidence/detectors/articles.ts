/**
 * Tier-1 `articles` detector (§10.3): article correctness — elision (je aime
 * -> j'aime; le/la + vowel -> l'), contraction (à le -> au, à les -> aux, de
 * le -> du, de les -> des), migrated from the legacy coachService GRAMMAR_RULES
 * el_je/el_le_la/el_de/el_que/con_au/con_du regexes (§1a — same patterns, now
 * emitting typed Observations instead of prose).
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, matchIndexSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

interface ArticleRule {
  type: 'elision_error' | 'contraction_error';
  pattern: RegExp;
}

// A trailing \b right after an accented character (é/è/ê/à/û/ô...) never
// matches in JS — \b is defined only against ASCII \w, so a word ending in
// an accented letter never registers a boundary there. Every alternation
// below that can end on an accented word replaces the trailing \b with a
// following-space/string-edge/punctuation lookahead instead.
const WORD_END = '(?=$|[ .,!?])';

const RULES: ArticleRule[] = [
  { type: 'elision_error', pattern: new RegExp(`\\bje (aime|ai|habite|arrive|écoute|ecoute|adore|étudie|etudie|espère|espere|achète|achete|utilise|organise|apprends|entends)${WORD_END}`, 'gi') },
  { type: 'elision_error', pattern: new RegExp(`\\b(le|la) (hôtel|hotel|hôpital|hopital|avion|ordinateur|école|ecole|université|universite|histoire|idée|idee|avis|été|ete|hiver|automne|examen|exercice)${WORD_END}`, 'gi') },
  { type: 'elision_error', pattern: new RegExp(`\\bde (un|une|ami|amie|école|ecole|université|universite|ordinateur|idée|idee|avis|eau|argent|orange)${WORD_END}`, 'gi') },
  { type: 'elision_error', pattern: /\bque (il|elle|ils|elles|on|un|une)\b/gi },
  // No leading \b either: \bà never matches (à is not a \w character) — a
  // preceding space/start-of-string lookbehind is the correct boundary.
  { type: 'contraction_error', pattern: /(?<=^| )à (le|les)\b/gi },
  { type: 'contraction_error', pattern: /\bde (le|les)\b/gi },
];

export const articlesDetector: Detector = {
  id: 'articles',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['article_error', 'contraction_error', 'elision_error'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      for (const rule of RULES) {
        const matches = unit.text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
        for (const match of matches) {
          const value = match[0];
          const span = matchIndexSpan(unit, match.index, value);
          observations.push({
            observationId: computeObservationId('articles', '1', rule.type, span, value),
            detectorId: 'articles',
            detectorVersion: '1',
            type: rule.type,
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

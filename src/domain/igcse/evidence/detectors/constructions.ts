/**
 * Tier-1 `constructions` detector (§10.3): migrates the remaining legacy
 * coachService GRAMMAR_RULES construction checks — subj_il_faut (subjunctive
 * after il faut que), si_clause (hypothetical sequence), rel_qui_subj
 * (relative pronoun qui vs que), comp_plus_bon/plus_bien (comparative
 * mistakes), dem_cet (demonstrative before vowel/mute h), pron_placement
 * (object pronoun word order) — plus a narrow interrogation-form check
 * (est-ce que malformed) newly added for the `interrogation_form` type.
 * Depends on both `tag-verbs` (verb-shaped context) and `tokenize`.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, matchIndexSpan } from '../framework/text';
import type { Observation } from '../framework/observation';
import type { ConcreteObservationType } from '../framework/observationTypes';

interface ConstructionRule {
  type: Extract<
    ConcreteObservationType,
    | 'subjunctive_missing'
    | 'hypothetical_form'
    | 'relative_pronoun'
    | 'comparative_form'
    | 'demonstrative_error'
    | 'pronoun_placement'
    | 'interrogation_form'
  >;
  pattern: RegExp;
  confidence: number;
}

const RULES: ConstructionRule[] = [
  {
    type: 'subjunctive_missing',
    pattern: /\bil faut que (je suis|j'ai|j ai|je vais|je fais|je peux|je veux|il est|il a|on est|nous sommes|vous êtes|vous etes|ils sont)\b/gi,
    confidence: 0.7,
  },
  {
    type: 'hypothetical_form',
    pattern: /\bsi (j'avais|j avais|j'étais|j etais|on pouvait|on avait|on était|on etait) (je vais|je ferai|je suis|je serai|j'irai|j irai)\b/gi,
    confidence: 0.7,
  },
  {
    type: 'relative_pronoun',
    pattern: /\bqui (je|tu|il|elle|on|nous|vous|ils|elles)\b/gi,
    confidence: 0.7,
  },
  {
    type: 'comparative_form',
    pattern: /\bplus (bon|bien)\b/gi,
    confidence: 0.7,
  },
  {
    type: 'demonstrative_error',
    // No trailing \b: the été/hôtel branches end in an accented character,
    // and JS's \b is ASCII-\w-only, so \b right after é/ô never matches — a
    // following space/string-edge lookahead is the correct boundary instead.
    pattern: /\bce (hôtel|hotel|homme|ordinateur|été|ete|ami|avion)(?=$|[ .,!?])/gi,
    confidence: 0.7,
  },
  {
    type: 'pronoun_placement',
    pattern: /\b(je|tu|il|elle|on|nous|vous|ils|elles) (aime|adore|vois|regarde|déteste|deteste|écoute|ecoute|aide|comprends|crois|appelle|rencontre) (le|la|les|lui|leur|me|te|nous|vous)\b/gi,
    confidence: 0.7,
  },
  {
    type: 'interrogation_form',
    pattern: /\bque (est|a|va|fait|sont|ont|vont|font)\b/gi,
    confidence: 0.7,
  },
];

export const constructionsDetector: Detector = {
  id: 'constructions',
  version: '1',
  tier: 1,
  dependsOn: ['tag-verbs', 'tokenize'],
  produces: [
    'subjunctive_missing',
    'hypothetical_form',
    'relative_pronoun',
    'comparative_form',
    'demonstrative_error',
    'pronoun_placement',
    'interrogation_form',
  ],
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
            observationId: computeObservationId('constructions', '1', rule.type, span, value),
            detectorId: 'constructions',
            detectorVersion: '1',
            type: rule.type,
            value,
            spans: span,
            confidence: rule.confidence,
            markInfluence: 'forbidden',
            skillNodeId: null,
          });
        }
      }
    }

    return observations;
  },
};

/**
 * Phase 3 (§10.3): the concrete ObservationType enum. observation.ts keeps
 * ObservationType as `string` for backward compatibility with Phase 0/1/2
 * (no detector produced typed values yet); this module is the closed set
 * Phase 3 detectors actually emit, exported separately so existing imports of
 * `ObservationType` are unaffected.
 */

export const OBSERVATION_TYPES = [
  // Tier 0
  'sentence',
  'lexeme',
  'verb',
  // Tier 1
  'tense_detected',
  'tense_missing',
  'agreement_gender',
  'agreement_number',
  'article_error',
  'contraction_error',
  'elision_error',
  'negation_incomplete',
  'auxiliary_error',
  'preposition_error',
  'anglicism',
  'complex_sentence',
  'connector_used',
  'lexeme_rare',
  'expected_vocab_hit',
  'repetition',
  'self_correction',
  'expected_structure_hit',
  'subjunctive_missing',
  'hypothetical_form',
  'relative_pronoun',
  'comparative_form',
  'demonstrative_error',
  'pronoun_placement',
  'interrogation_form',
  // Tier 2
  'avoidance',
  'tense_inconsistent',
  'lexical_density',
  'complexity_ratio',
  'tense_range',
] as const;

export type ConcreteObservationType = (typeof OBSERVATION_TYPES)[number];

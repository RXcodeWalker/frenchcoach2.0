/**
 * §Part 7 "False-positive suites": curated "clean" transcripts that must
 * produce ZERO issue-observations — the single most important guard against
 * the legacy system's biggest failure mode (hallucinated errors). Only the
 * ISSUE-shaped observation types are asserted zero here; neutral/feature
 * types (sentence, lexeme, verb, tense_detected, connector_used, complex_
 * sentence, expected_vocab_hit, repetition, lexical_density,
 * complexity_ratio, tense_range) are facts, not issues, and are expected to
 * fire on any real response.
 */

import { describe, expect, it } from 'vitest';
import { LEGACY_DETECTORS } from '../../framework/legacyDetectors';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { DetectorRegistry } from '../../framework/registry';
import { runDetectors } from '../../framework/runner';
import { oneResponseTranscript } from './fixtures';

const FULL_FLEET = [...LEGACY_DETECTORS, ...PHASE3_DETECTORS];
const REGISTRY = new DetectorRegistry(FULL_FLEET);

const ISSUE_TYPES = new Set([
  'agreement_gender',
  'agreement_number',
  'article_error',
  'contraction_error',
  'elision_error',
  'negation_incomplete',
  'auxiliary_error',
  'preposition_error',
  'anglicism',
  'subjunctive_missing',
  'hypothetical_form',
  'relative_pronoun',
  'comparative_form',
  'demonstrative_error',
  'pronoun_placement',
  'interrogation_form',
]);

const CLEAN_TRANSCRIPTS = [
  "J'aime beaucoup le sport et la musique.",
  "La semaine dernière, j'ai visité Paris avec ma famille.",
  "Je vais voyager en France l'année prochaine.",
  "Si j'avais plus de temps, je lirais davantage.",
  "Il faut que je sois prêt pour l'examen.",
  "C'est le livre que je préfère parmi tous.",
  "Cet hôtel est plus grand que l'autre.",
  "Je le vois tous les jours après l'école.",
  "D'habitude, je joue au football avec mes amis le weekend.",
  "Ma mère travaille dans un bureau en ville.",
];

describe('false-positive suite: clean transcripts produce zero issue-observations', () => {
  for (const [index, text] of CLEAN_TRANSCRIPTS.entries()) {
    it(`clean transcript ${index + 1}: "${text.slice(0, 40)}..." fires no issue-typed observation`, () => {
      const transcript = oneResponseTranscript(text);
      const result = runDetectors(REGISTRY, { transcript, questionSet: null });
      const issues = result.observations.filter((o) => ISSUE_TYPES.has(o.type));
      expect(issues, JSON.stringify(issues)).toEqual([]);
    });
  }

  it('every detector reaches success (no detector crashes) on every clean transcript', () => {
    for (const text of CLEAN_TRANSCRIPTS) {
      const transcript = oneResponseTranscript(text);
      const result = runDetectors(REGISTRY, { transcript, questionSet: null });
      const failed = result.detectorRuns.filter((r) => r.state === 'failed');
      expect(failed, JSON.stringify(failed)).toEqual([]);
    }
  });
});

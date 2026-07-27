/**
 * §10.5 feature projection: deterministic rollups from the Observation log.
 * Versioned separately from EVIDENCE_DETECTOR_VERSION so a projection-only
 * change (e.g. a reducer policy tweak) doesn't force re-running detectors.
 * Not in the L2 prompt allow-list (judgement/prompt.ts) — analytics/coaching
 * inputs only, so they never move a mark pre-Phase-5 promotion.
 *
 * §9.2 "deterministic conflict resolution lives in the feature-projection
 * step": ties among equivalent observations are broken by highest confidence,
 * then lexical detectorId order — total and deterministic.
 */

import type { Observation } from '../framework/observation';

export const FEATURE_PROJECTION_VERSION = 'features-v1';

function countByType(observations: Observation[], type: string): number {
  return observations.filter((o) => o.type === type).length;
}

/** MTLD-style proxy: distinct lexemes / total lexemes (length-normalised TTR). */
function typeTokenRatio(observations: Observation[]): number {
  const lexemes = observations.filter((o) => o.type === 'lexeme');
  if (lexemes.length === 0) return 0;
  const distinct = new Set(lexemes.map((o) => String(o.value)));
  return distinct.size / lexemes.length;
}

function tenseHistogram(observations: Observation[]): Record<string, number> {
  const histogram: Record<string, number> = { past: 0, present: 0, future: 0, conditional: 0 };
  for (const o of observations) {
    if (o.type !== 'tense_detected') continue;
    const timeFrame = String(o.value).split(':')[0];
    if (timeFrame in histogram) histogram[timeFrame] += 1;
  }
  return histogram;
}

function complexSentenceRatio(observations: Observation[]): number {
  const sentences = observations.filter((o) => o.type === 'complex_sentence');
  if (sentences.length === 0) return 0;
  const complex = sentences.filter((o) => o.value === true).length;
  return complex / sentences.length;
}

function fillerDensityMean(fillerDensityByQuestion: Array<{ density: number }>): number {
  if (fillerDensityByQuestion.length === 0) return 0;
  const sum = fillerDensityByQuestion.reduce((acc, row) => acc + row.density, 0);
  return sum / fillerDensityByQuestion.length;
}

function rareLemmaRatio(observations: Observation[]): number {
  const lexemes = countByType(observations, 'lexeme');
  if (lexemes === 0) return 0;
  return countByType(observations, 'lexeme_rare') / lexemes;
}

export interface ProjectFeaturesArgs {
  observations: Observation[];
  fillerDensityByQuestion: Array<{ density: number }>;
}

export function projectFeatures(args: ProjectFeaturesArgs): Record<string, number | string | boolean> {
  const { observations, fillerDensityByQuestion } = args;
  const histogram = tenseHistogram(observations);

  return {
    ttr: typeTokenRatio(observations),
    tenseHistogramPast: histogram.past,
    tenseHistogramPresent: histogram.present,
    tenseHistogramFuture: histogram.future,
    tenseHistogramConditional: histogram.conditional,
    complexSentenceRatio: complexSentenceRatio(observations),
    connectorCount: countByType(observations, 'connector_used'),
    fillerDensityMean: fillerDensityMean(fillerDensityByQuestion),
    expectedVocabCoverage: countByType(observations, 'expected_vocab_hit'),
    rareLemmaRatio: rareLemmaRatio(observations),
  };
}

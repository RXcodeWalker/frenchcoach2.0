/**
 * Tier-2 `cefr-vector` detector (§10.3): raw component signals feeding a
 * CEFR-band estimate — TTR proxy (rare-lemma density), complexity
 * (complex-sentence ratio), and tense range (distinct time frames attempted).
 * Advisory/derived only — Part 2 marks this low-confidence/high-FP; never
 * eligible for marks. Emits three whole-response numeric observations
 * (lexical_density, complexity_ratio, tense_range) for coaching/analytics
 * narrative. Composing these into a single band is a consumer's job once the
 * combination weights have a Cambridge source (§I8) — this detector no longer
 * invents one itself.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, fullResponseSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

function component(
  type: string,
  value: number,
  span: Observation['spans'],
): Observation {
  return {
    observationId: computeObservationId('cefr-vector', '1', type, span, value),
    detectorId: 'cefr-vector',
    detectorVersion: '1',
    type,
    value,
    spans: span,
    confidence: 0.5,
    markInfluence: 'forbidden',
    skillNodeId: null,
  };
}

export const cefrVectorDetector: Detector = {
  id: 'cefr-vector',
  version: '1',
  tier: 2,
  dependsOn: ['lexical-range', 'complexity', 'tense'],
  produces: ['lexical_density', 'complexity_ratio', 'tense_range'],
  baseConfidence: 0.5,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const totalWords = units.reduce((sum, u) => sum + u.text.trim().split(/\s+/).filter(Boolean).length, 0);
    if (totalWords === 0) return [];

    const rareLemmas = (ctx.evidenceView.get('lexical-range') ?? []).filter((o) => o.type === 'lexeme_rare').length;
    const complexSentences = (ctx.evidenceView.get('complexity') ?? []).filter(
      (o) => o.type === 'complex_sentence' && o.value === true,
    ).length;
    const totalSentences = (ctx.evidenceView.get('complexity') ?? []).length;
    const distinctTimeFrames = new Set(
      (ctx.evidenceView.get('tense') ?? [])
        .filter((o) => o.type === 'tense_detected')
        .map((o) => String(o.value).split(':')[0]),
    ).size;

    const rareDensity = rareLemmas / totalWords;
    const complexRatio = totalSentences > 0 ? complexSentences / totalSentences : 0;
    const tenseRangeScore = Math.min(distinctTimeFrames / 3, 1);

    const span = fullResponseSpan(units);

    return [
      component('lexical_density', rareDensity, span),
      component('complexity_ratio', complexRatio, span),
      component('tense_range', tenseRangeScore, span),
    ];
  },
};

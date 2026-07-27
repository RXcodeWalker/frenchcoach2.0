/**
 * Tier-2 `cefr-vector` detector (§10.3): CEFR-band indicator vector, composed
 * from TTR proxy (rare-lemma density) + complexity (complex-sentence ratio) +
 * tense range (distinct time frames attempted). Advisory/derived only — Part
 * 2 marks this low-confidence/high-FP; never eligible for marks. Emits a
 * single whole-response `cefr_indicator` observation with a coarse
 * 'A1'|'A2'|'B1'|'B2' value, purely for coaching/analytics narrative.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, fullResponseSpan } from '../framework/text';
import type { Observation } from '../framework/observation';

type CefrBand = 'A1' | 'A2' | 'B1' | 'B2';

function bandFromScore(score: number): CefrBand {
  if (score >= 2.5) return 'B2';
  if (score >= 1.5) return 'B1';
  if (score >= 0.5) return 'A2';
  return 'A1';
}

export const cefrVectorDetector: Detector = {
  id: 'cefr-vector',
  version: '1',
  tier: 2,
  dependsOn: ['lexical-range', 'complexity', 'tense'],
  produces: ['cefr_indicator'],
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

    const score = rareDensity * 3 + complexRatio * 2 + tenseRangeScore;
    const band = bandFromScore(score);

    const span = fullResponseSpan(units);
    const observation: Observation = {
      observationId: computeObservationId('cefr-vector', '1', 'cefr_indicator', span, band),
      detectorId: 'cefr-vector',
      detectorVersion: '1',
      type: 'cefr_indicator',
      value: band,
      spans: span,
      confidence: 0.5,
      markInfluence: 'forbidden',
      skillNodeId: null,
    };

    return [observation];
  },
};

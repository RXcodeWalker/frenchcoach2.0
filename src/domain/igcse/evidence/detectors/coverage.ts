/**
 * Tier-1 `coverage` detector (§10.3): expected-vocabulary coverage. The full
 * §10.3 spec (question-bank `keyVocab`/target-structure hit-rate) needs a
 * question-bank field that does not exist on `SessionQuestionSet`
 * (stt/types.ts — that's a content-authoring concept in backend/data/igcse/*
 * .json, not the session-transcript-facing type). Until that field exists,
 * this detector emits the coverage proxy that IS available today: candidate
 * response vs. the question's own prompt text (mainText/alternativeTexts)
 * content-word overlap, reusing the relevance-proxy idea from Part 2 ("overlap
 * of response vs prompt"). `questionSet` is optional at every current call
 * site (see DetectorContext.questionSet) — this detector degrades to emitting
 * nothing (not `failed`) when it is null, since "no question set supplied" is
 * a valid, deterministic input, not a defect.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, normalize, spanWithinUnit, type ResponseUnit } from '../framework/text';
import type { Observation } from '../framework/observation';
import type { SessionQuestion } from '../../stt/types';

const STOPWORDS = new Set([
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'et', 'ou', 'que', 'qui', 'qu', 'ce', 'est', 'as', 'ton', 'ta', 'tes',
  'pour', 'avec', 'dans', 'sur', 'a', 'tu as', 'quel', 'quelle',
]);

function contentWords(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(' ')
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

function findQuestion(questions: SessionQuestion[], unit: ResponseUnit): SessionQuestion | undefined {
  const [, turnId] = unit.unitId.split(':');
  return questions.find((q) => q.questionId === turnId || q.questionId === unit.unitId);
}

export const coverageDetector: Detector = {
  id: 'coverage',
  version: '1',
  tier: 1,
  dependsOn: ['tokenize'],
  produces: ['expected_vocab_hit'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    if (!ctx.questionSet) return [];

    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      if (unit.source === 'rolePlay') continue;
      const question = findQuestion(ctx.questionSet.questions, unit);
      if (!question) continue;

      const promptWords = new Set([
        ...contentWords(question.mainText),
        ...question.alternativeTexts.flatMap((alt) => [...contentWords(alt)]),
      ]);
      const responseWords = contentWords(unit.text);
      const hits = [...responseWords].filter((w) => promptWords.has(w)).sort();

      for (const word of hits) {
        const span = spanWithinUnit(unit, word);
        observations.push({
          observationId: computeObservationId('coverage', '1', 'expected_vocab_hit', span, word),
          detectorId: 'coverage',
          detectorVersion: '1',
          type: 'expected_vocab_hit',
          value: word,
          spans: span,
          confidence: 0.9,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
      }
    }

    return observations;
  },
};

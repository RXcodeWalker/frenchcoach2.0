import type { PronunciationAssessment } from '../types';

const BASE_ASSESSMENT: PronunciationAssessment = {
  score: 85,
  transcript: 'Un bon vin blanc.',
  issues: [
    {
      word: 'vin',
      ipaExpected: '',
      ipaHeard: '',
      problem: "'vin' was mispronounced",
      severity: 'medium',
      drill: { hint: "Practise 'vin' slowly, then say it in the full phrase.", repeatPhrase: 'Un bon vin blanc.' },
      expected: 'vin',
      heard: 'vin',
    },
  ],
  words: [
    { word: 'Un', accuracyScore: 95, errorType: 'correct', confidence: null },
    { word: 'bon', accuracyScore: 88, errorType: 'correct', confidence: null },
    { word: 'vin', accuracyScore: 35, errorType: 'mispronounced', confidence: null },
    { word: 'blanc', accuracyScore: 92, errorType: 'correct', confidence: null },
  ],
  provider: 'azure',
  subScores: { accuracy: 82, fluency: 90, completeness: 100 },
};

export function buildPronunciationAssessment(
  overrides: Partial<PronunciationAssessment> = {},
): PronunciationAssessment {
  return { ...BASE_ASSESSMENT, ...overrides };
}

export const PRONUNCIATION_GOLDEN_ASSESSMENT: PronunciationAssessment = buildPronunciationAssessment();

export const PRONUNCIATION_WHISPER_HEURISTIC_ASSESSMENT: PronunciationAssessment = buildPronunciationAssessment({
  provider: 'whisper-heuristic',
  subScores: null,
  words: BASE_ASSESSMENT.words.map((w) => ({ ...w, accuracyScore: null, errorType: null, confidence: 0.8 })),
});

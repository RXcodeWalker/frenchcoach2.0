import type { PronunciationAssessment, PronunciationWordResult } from '../../types';

/** One Azure word. `phonemes` are accuracies with empty names, as fr-FR returns them. */
export function azureWord(
  word: string,
  accuracyScore: number | null,
  overrides: Partial<PronunciationWordResult> & { phonemeScores?: Array<number | null> } = {},
): PronunciationWordResult {
  const { phonemeScores, ...rest } = overrides;
  return {
    word,
    accuracyScore,
    errorType: 'correct',
    confidence: null,
    phonemes: phonemeScores ? phonemeScores.map((a) => ({ phoneme: '', accuracyScore: a })) : null,
    ...rest,
  };
}

export function scripted(words: PronunciationWordResult[], overrides: Partial<PronunciationAssessment> = {}): PronunciationAssessment {
  return {
    score: 80,
    transcript: words.map((w) => w.word).join(' '),
    issues: [],
    words,
    provider: 'azure',
    subScores: { accuracy: 80, fluency: 80, completeness: 100, prosody: null },
    couldNotAssess: false,
    couldNotAssessReason: null,
    mode: 'scripted',
    ...overrides,
  };
}

import { describe, it, expect } from 'vitest';
import { outcomeFor, isNearMiss } from '../SayItAgainCard';
import { PRACTICE_PASS_SCORE, PRACTICE_NEAR_MISS_SCORE, PRACTICE_MAX_ATTEMPTS } from '../../../../domain/pronunciation/practiceThresholds';
import type { PronunciationAssessment } from '../../../../domain/pronunciation/types';

function azureResult(score: number): PronunciationAssessment {
  return {
    score,
    transcript: 'x',
    issues: [],
    words: [],
    provider: 'azure',
    subScores: { accuracy: score, fluency: score, completeness: score, prosody: score },
    couldNotAssess: false,
    couldNotAssessReason: null,
  };
}

function whisperResult(score: number): PronunciationAssessment {
  return {
    score,
    transcript: 'x',
    issues: [],
    words: [],
    provider: 'whisper-heuristic',
    subScores: null,
    couldNotAssess: false,
    couldNotAssessReason: null,
  };
}

function couldNotAssessAzureResult(reason: string): PronunciationAssessment {
  return {
    score: null,
    transcript: '',
    issues: [],
    words: [],
    provider: 'azure',
    subScores: null,
    couldNotAssess: true,
    couldNotAssessReason: reason,
  };
}

describe('outcomeFor — practice step state machine', () => {
  it('passes on a score at or above PRACTICE_PASS_SCORE, attempt 1', () => {
    expect(outcomeFor(azureResult(PRACTICE_PASS_SCORE), 1)).toBe('pass');
    expect(outcomeFor(azureResult(100), 1)).toBe('pass');
  });

  it('retries on a near-miss score, attempt 1', () => {
    expect(outcomeFor(azureResult(PRACTICE_NEAR_MISS_SCORE), 1)).toBe('retry');
    expect(outcomeFor(azureResult(PRACTICE_PASS_SCORE - 1), 1)).toBe('retry');
  });

  it('retries on a low score, attempt 1', () => {
    expect(outcomeFor(azureResult(0), 1)).toBe('retry');
    expect(outcomeFor(azureResult(PRACTICE_NEAR_MISS_SCORE - 1), 1)).toBe('retry');
  });

  it('advances with no verdict once PRACTICE_MAX_ATTEMPTS is reached, any score', () => {
    expect(outcomeFor(azureResult(0), PRACTICE_MAX_ATTEMPTS)).toBe('advance-no-verdict');
    expect(outcomeFor(azureResult(PRACTICE_NEAR_MISS_SCORE), PRACTICE_MAX_ATTEMPTS)).toBe('advance-no-verdict');
  });

  it('passes at PRACTICE_MAX_ATTEMPTS if the score clears the bar', () => {
    expect(outcomeFor(azureResult(PRACTICE_PASS_SCORE), PRACTICE_MAX_ATTEMPTS)).toBe('pass');
  });

  it('never offers a third attempt: no attempt value can produce retry once at PRACTICE_MAX_ATTEMPTS', () => {
    for (let score = 0; score <= 100; score += 5) {
      const outcome = outcomeFor(azureResult(score), PRACTICE_MAX_ATTEMPTS);
      expect(outcome).not.toBe('retry');
    }
  });

  it('provider !== azure never yields a verdict, regardless of score or attempt', () => {
    for (const score of [0, 40, 55, 70, 100]) {
      for (const attempt of [1, PRACTICE_MAX_ATTEMPTS]) {
        expect(outcomeFor(whisperResult(score), attempt)).toBe('advance-no-verdict');
      }
    }
  });

  it('couldNotAssess never yields a verdict, regardless of attempt (never a fabricated pass/retry)', () => {
    for (const attempt of [1, PRACTICE_MAX_ATTEMPTS]) {
      expect(outcomeFor(couldNotAssessAzureResult('no_speech_recognized'), attempt)).toBe('advance-no-verdict');
      expect(outcomeFor(couldNotAssessAzureResult('silence'), attempt)).toBe('advance-no-verdict');
    }
  });
});

describe('isNearMiss', () => {
  it('is true for [PRACTICE_NEAR_MISS_SCORE, PRACTICE_PASS_SCORE)', () => {
    expect(isNearMiss(PRACTICE_NEAR_MISS_SCORE)).toBe(true);
    expect(isNearMiss(PRACTICE_PASS_SCORE - 1)).toBe(true);
  });

  it('is false below PRACTICE_NEAR_MISS_SCORE and at/above PRACTICE_PASS_SCORE', () => {
    expect(isNearMiss(PRACTICE_NEAR_MISS_SCORE - 1)).toBe(false);
    expect(isNearMiss(PRACTICE_PASS_SCORE)).toBe(false);
    expect(isNearMiss(100)).toBe(false);
  });
});

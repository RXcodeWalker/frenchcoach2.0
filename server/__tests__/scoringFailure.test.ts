import { describe, expect, it } from 'vitest';
import { classifyScoringFailure } from '../scoringFailure';
import { JudgementValidationError } from '../../src/domain/igcse/judgement/schema';
import { JudgeUnavailableError } from '../../scripts/scoring/providers/judgeFactory';

describe('classifyScoringFailure', () => {
  it('an invalid judge reply is judge_invalid_output', () => {
    expect(classifyScoringFailure(new JudgementValidationError('Judge response is not valid JSON'))).toBe(
      'judge_invalid_output',
    );
  });

  it('both providers failing is judge_unavailable', () => {
    expect(classifyScoringFailure(new JudgeUnavailableError('Both judge providers failed. …'))).toBe(
      'judge_unavailable',
    );
  });

  it('anything else is internal', () => {
    expect(classifyScoringFailure(new Error('SupabaseTranscriptStore.save failed'))).toBe('internal');
    expect(classifyScoringFailure('not even an Error')).toBe('internal');
  });
});

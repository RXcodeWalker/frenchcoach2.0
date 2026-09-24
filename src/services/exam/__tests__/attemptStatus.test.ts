import { describe, expect, it } from 'vitest';
import { countsTowardProgress, resolveCoachedMode } from '../attemptStatus';
import type { Utterance } from '../../../domain/igcse/stt/types';

function candidateUtterance(overrides: Partial<Utterance> = {}): Utterance {
  return {
    utteranceId: 'u1',
    role: 'candidate',
    speakerCluster: 'spk1',
    part: 'topic1',
    questionId: 'topic1:t1q1',
    startS: 0,
    endS: 1,
    text: 'Bonjour',
    words: [],
    ...overrides,
  };
}

describe('countsTowardProgress', () => {
  it('counts a spoken, unedited, Exam Sim attempt', () => {
    const status = countsTowardProgress({
      coached: false,
      transcript: { userCorrected: false, utterances: [candidateUtterance({ inputMode: 'speech' })] },
    });
    expect(status).toEqual({ countsTowardProgress: true, reasons: [] });
  });

  it('is false for a coached attempt', () => {
    const status = countsTowardProgress({
      coached: true,
      transcript: { userCorrected: false, utterances: [candidateUtterance({ inputMode: 'speech' })] },
    });
    expect(status.countsTowardProgress).toBe(false);
    expect(status.reasons).toContain('You had examiner feedback during the test');
  });

  it('is false when the transcript was user-corrected, even in Exam Sim', () => {
    const status = countsTowardProgress({
      coached: false,
      transcript: { userCorrected: true, utterances: [candidateUtterance({ inputMode: 'speech' })] },
    });
    expect(status.countsTowardProgress).toBe(false);
    expect(status.reasons).toContain('You edited your transcript');
  });

  it('is false when any candidate utterance was typed, and names the count', () => {
    const status = countsTowardProgress({
      coached: false,
      transcript: {
        userCorrected: false,
        utterances: [
          candidateUtterance({ utteranceId: 'u1', inputMode: 'speech' }),
          candidateUtterance({ utteranceId: 'u2', inputMode: 'text' }),
        ],
      },
    });
    expect(status.countsTowardProgress).toBe(false);
    expect(status.reasons).toContain('1 answers were typed');
  });

  it('combines every applicable reason', () => {
    const status = countsTowardProgress({
      coached: true,
      transcript: {
        userCorrected: true,
        utterances: [candidateUtterance({ inputMode: 'text' })],
      },
    });
    expect(status.reasons).toHaveLength(3);
  });
});

describe('resolveCoachedMode', () => {
  it('passes through the requested mode outside a competitive run', () => {
    expect(resolveCoachedMode(true, false)).toBe(true);
    expect(resolveCoachedMode(false, false)).toBe(false);
  });

  it('forces Exam Sim for a competitive run regardless of the requested mode', () => {
    expect(resolveCoachedMode(true, true)).toBe(false);
    expect(resolveCoachedMode(false, true)).toBe(false);
  });
});

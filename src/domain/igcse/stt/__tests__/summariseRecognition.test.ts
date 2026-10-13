import { describe, expect, it } from 'vitest';
import { summariseRecognition } from '../quality/summariseRecognition';
import type { Utterance, UtteranceRecognition } from '../types';

const live = (text: string) => ({ source: 'web-speech-live' as const, text });
const batch: UtteranceRecognition = {
  primary: { text: 'a', model: 'whisper-large-v3', promptHash: 'h', segments: [] },
  secondary: live('b'),
  selected: 'primary',
  fallbackReason: null,
};
const fallback = (reason: NonNullable<UtteranceRecognition['fallbackReason']>): UtteranceRecognition => ({
  secondary: live('b'),
  selected: 'secondary',
  fallbackReason: reason,
});

function utt(role: 'candidate' | 'examiner', recognition?: UtteranceRecognition): Utterance {
  return {
    utteranceId: Math.random().toString(36), role, speakerCluster: 'x', part: 'topic1', questionId: null,
    startS: 0, endS: 1, text: 'x', words: [], ...(recognition ? { recognition } : {}),
  };
}

describe('summariseRecognition', () => {
  it('is all zeros for a transcript with no recognition records', () => {
    expect(summariseRecognition({ utterances: [utt('candidate'), utt('examiner')] })).toEqual({
      recognisedAnswers: 0, fromBatch: 0, fromLiveCaptions: 0, reasons: {}, model: null,
    });
  });

  it('counts batch readings and live-caption fallbacks by reason, and reports the batch model', () => {
    const summary = summariseRecognition({
      utterances: [
        utt('candidate', batch),
        utt('candidate', fallback('asr-failed')),
        utt('candidate', fallback('asr-failed')),
        utt('candidate', fallback('quota')),
        utt('candidate'), // typed or edited: no record, not counted
        utt('examiner', batch), // examiner speech is never counted
      ],
    });
    expect(summary).toEqual({
      recognisedAnswers: 4, fromBatch: 1, fromLiveCaptions: 3, reasons: { 'asr-failed': 2, quota: 1 }, model: 'whisper-large-v3',
    });
  });
});

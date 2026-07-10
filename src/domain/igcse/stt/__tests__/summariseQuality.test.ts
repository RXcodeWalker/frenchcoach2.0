import { describe, it, expect } from 'vitest';
import { summariseQuality } from '../quality/summariseQuality';
import type { SessionTranscript, Utterance } from '../types';

function baseSession(utterances: Utterance[]): SessionTranscript {
  return {
    schemaVersion: 'session-transcript-v1',
    assemblerVersion: 'stt-assembler-v1',
    sessionId: 's1',
    recordedAt: '2026-05-01T00:00:00.000Z',
    contentProvenance: 'confidential-internal',
    userCorrected: false,
    audio: { sha256: 'x', durationS: 10, sampleRateHz: 16000, channels: 1 },
    stt: {
      model: 'm',
      modelVersion: '1',
      provider: 'p',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'h',
      confidenceSource: 'whisperx-align-score',
      promptBiasedRetries: 0,
      transcribedAt: '2026-05-01T00:00:00.000Z',
    },
    annotationSource: 'asr-annotation',
    questionSetId: 'qs',
    questionSetHash: 'h',
    matchThreshold: 0.6,
    roleLabelConfidence: 1,
    utterances,
    examinerEvents: [],
  };
}

function utt(words: { text: string; confidence: number }[]): Utterance {
  return {
    utteranceId: 'u1',
    role: 'candidate',
    speakerCluster: 'A',
    part: 'topic1',
    questionId: null,
    startS: 0,
    endS: 1,
    text: words.map((w) => w.text).join(' '),
    words: words.map((w) => ({ text: w.text, startS: 0, endS: 0.1, confidence: w.confidence })),
  };
}

describe('summariseQuality', () => {
  it('mean is over words, not utterances: one long confident sentence must not mask a garbled short one', () => {
    const longConfident = utt(Array.from({ length: 20 }, (_, i) => ({ text: `w${i}`, confidence: 0.95 })));
    const shortGarbled = utt([{ text: 'euh', confidence: 0.1 }]);
    const quality = summariseQuality(baseSession([longConfident, shortGarbled]));

    // Per-utterance mean would be (0.95 + 0.1) / 2 = 0.525; per-word mean is much higher
    // because the garbled utterance contributes only one low word out of 21 total.
    const perUtteranceMean = 0.525;
    expect(quality.meanWordConfidence).toBeGreaterThan(perUtteranceMean);
  });

  it('lowConfidenceSpanRatio boundary at the threshold', () => {
    const atThreshold = utt([{ text: 'a', confidence: 0.3 }]);
    const belowThreshold = utt([{ text: 'b', confidence: 0.29 }]);
    const quality = summariseQuality(baseSession([atThreshold, belowThreshold]));

    expect(quality.lowConfidenceSpanCount).toBe(1);
    expect(quality.lowConfidenceSpanRatio).toBeCloseTo(0.5);
  });

  it('handles zero words without dividing by zero', () => {
    const quality = summariseQuality(baseSession([]));
    expect(quality.meanWordConfidence).toBe(0);
    expect(quality.lowConfidenceSpanRatio).toBe(0);
    expect(quality.lowConfidenceSpanCount).toBe(0);
  });
});

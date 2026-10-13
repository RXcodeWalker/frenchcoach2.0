import { describe, expect, it } from 'vitest';
import { isBatchAsrTurn, noAudioRecognition, selectedRecognitionText, wordConfidences } from '../recognition';
import type { ConductLogCandidateEntry } from '../types';
import type { RecognitionSegment } from '../../stt/types';

const seg = (text: string, avgLogprob: number | null): RecognitionSegment => ({
  startS: 0,
  endS: 1,
  text,
  avgLogprob,
  noSpeechProb: 0,
  compressionRatio: 1,
});

function entry(over: Partial<ConductLogCandidateEntry> = {}): ConductLogCandidateEntry {
  return {
    kind: 'candidate',
    seq: 2,
    startS: 0,
    endS: 3,
    part: 'topic1',
    questionId: 'q1',
    transcript: 'Je mange',
    wordCount: 2,
    requestedRepeat: false,
    relevant: true,
    ...over,
  };
}

describe('isBatchAsrTurn', () => {
  it('accepts a spoken answer', () => {
    expect(isBatchAsrTurn(entry())).toBe(true);
    expect(isBatchAsrTurn(entry({ intent: 'answer' }))).toBe(true);
  });
  it.each([
    ['typed', entry({ inputMode: 'text' })],
    ['repeat request flag', entry({ requestedRepeat: true })],
    ['repeat intent', entry({ intent: 'repeat_request' })],
    ['clarification', entry({ intent: 'clarification_request' })],
    ['non-French', entry({ intent: 'non_french' })],
    ["je ne sais pas", entry({ intent: 'dont_know' })],
    ['empty', entry({ transcript: '   ' })],
  ])('rejects %s', (_label, e) => {
    expect(isBatchAsrTurn(e)).toBe(false);
  });
  it('rejects examiner entries', () => {
    expect(
      isBatchAsrTurn({
        kind: 'examiner', seq: 1, atS: 0, part: 'topic1', action: 'READ_MAIN', questionId: 'q1', variant: 'main', text: 'Q', trigger: 'scripted',
      }),
    ).toBe(false);
  });
});

describe('selectedRecognitionText / noAudioRecognition', () => {
  it('reads the selected recogniser', () => {
    const fb = noAudioRecognition('live text');
    expect(fb).toEqual({ secondary: { source: 'web-speech-live', text: 'live text' }, selected: 'secondary', fallbackReason: 'no-audio' });
    expect(selectedRecognitionText(fb)).toBe('live text');
    expect(
      selectedRecognitionText({
        primary: { text: 'whisper text', model: 'm', promptHash: 'h', segments: [] },
        secondary: fb.secondary,
        selected: 'primary',
        fallbackReason: null,
      }),
    ).toBe('whisper text');
  });
});

describe('wordConfidences', () => {
  it('is undefined with no usable segment signal', () => {
    expect(wordConfidences(3, [])).toBeUndefined();
    expect(wordConfidences(3, [seg('a b c', null)])).toBeUndefined();
    expect(wordConfidences(0, [seg('a', -0.1)])).toBeUndefined();
  });

  it('maps exp(avgLogprob) onto each word of its segment, clamped to 0..1', () => {
    const out = wordConfidences(5, [seg('un deux', -0.5), seg('trois quatre cinq', -2)]);
    expect(out).toHaveLength(5);
    expect(out?.slice(0, 2).every((c) => Math.abs(c - Math.exp(-0.5)) < 1e-9)).toBe(true);
    expect(out?.slice(2).every((c) => Math.abs(c - Math.exp(-2)) < 1e-9)).toBe(true);
    expect(wordConfidences(1, [seg('a', 0.7)])).toEqual([1]);
  });

  it('always returns exactly wordCount values even when the segments split the text differently', () => {
    expect(wordConfidences(6, [seg('a b', -0.1), seg('c', -0.1)])).toHaveLength(6);
    expect(wordConfidences(2, [seg('a b c d', -0.1)])).toHaveLength(2);
  });

  it('a segment with no signal counts as full confidence for its words', () => {
    const out = wordConfidences(2, [seg('a', null), seg('b', -1)]);
    expect(out?.[0]).toBe(1);
    expect(out?.[1]).toBeCloseTo(Math.exp(-1), 9);
  });
});

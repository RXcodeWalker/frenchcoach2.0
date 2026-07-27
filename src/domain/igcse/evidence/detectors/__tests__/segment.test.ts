import { describe, expect, it } from 'vitest';
import { segmentSentences, segmentDetector } from '../segment';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('segmentSentences', () => {
  it('splits on terminal punctuation', () => {
    expect(segmentSentences("J'aime le foot. Je joue le weekend.")).toEqual([
      "J'aime le foot.",
      'Je joue le weekend.',
    ]);
  });

  it('splits on question marks and exclamation marks', () => {
    expect(segmentSentences('Tu aimes ça ? Oui ! Vraiment.')).toEqual(['Tu aimes ça ?', 'Oui !', 'Vraiment.']);
  });

  it('returns a single segment for text with no terminal punctuation', () => {
    expect(segmentSentences('je mange une pomme')).toEqual(['je mange une pomme']);
  });

  it('returns empty array for empty/whitespace-only text', () => {
    expect(segmentSentences('')).toEqual([]);
    expect(segmentSentences('   ')).toEqual([]);
  });
});

describe('segment detector', () => {
  it('emits one sentence observation per segment, feature-only (skillNodeId null)', () => {
    const transcript = oneResponseTranscript("J'aime le foot. Je joue le weekend.");
    const observations = runDetectorChain(segmentDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(2);
    expect(observations.every((o) => o.skillNodeId === null)).toBe(true);
    expect(observations.every((o) => o.markInfluence === 'forbidden')).toBe(true);
    expect(observations.map((o) => o.value)).toEqual(["J'aime le foot.", 'Je joue le weekend.']);
  });

  it('every span is a verified substring of the response text (quote-verification property)', () => {
    const transcript = oneResponseTranscript("J'aime le foot. Je joue le weekend.");
    const observations = runDetectorChain(segmentDetector, PHASE3_DETECTORS, transcript);
    const fullText = transcript.topicConversations[0].turns[0].candidateResponse;
    for (const obs of observations) {
      const span = obs.spans[0];
      const quoted = fullText.slice(span.startOffset, span.endOffset);
      expect(quoted).toBe(obs.value);
    }
  });

  it('is deterministic: same input yields identical observationIds across runs', () => {
    const transcript = oneResponseTranscript("J'aime le foot. Je joue le weekend.");
    const first = runDetectorChain(segmentDetector, PHASE3_DETECTORS, transcript);
    const second = runDetectorChain(segmentDetector, PHASE3_DETECTORS, transcript);
    expect(first.map((o) => o.observationId)).toEqual(second.map((o) => o.observationId));
  });
});

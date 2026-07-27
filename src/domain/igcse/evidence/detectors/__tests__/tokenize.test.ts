import { describe, expect, it } from 'vitest';
import { tokenizeDetector } from '../tokenize';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('tokenize detector', () => {
  it('emits one lexeme observation per normalised word', () => {
    const transcript = oneResponseTranscript("J'aime le foot");
    const observations = runDetectorChain(tokenizeDetector, PHASE3_DETECTORS, transcript);
    expect(observations.map((o) => o.value)).toEqual(['j', 'aime', 'le', 'foot']);
    expect(observations.every((o) => o.skillNodeId === null)).toBe(true);
  });

  it('disambiguates repeated tokens with distinct spans and observationIds (set-not-bag, §9.2)', () => {
    const transcript = oneResponseTranscript('le chat et le chien et le poisson');
    const observations = runDetectorChain(tokenizeDetector, PHASE3_DETECTORS, transcript);
    const leObservations = observations.filter((o) => o.value === 'le');
    expect(leObservations).toHaveLength(3);
    const ids = new Set(leObservations.map((o) => o.observationId));
    expect(ids.size).toBe(3);
    const spans = leObservations.map((o) => `${o.spans[0].startOffset}:${o.spans[0].endOffset}`);
    expect(new Set(spans).size).toBe(3);
  });

  it('returns no observations for an empty response', () => {
    const transcript = oneResponseTranscript('');
    const observations = runDetectorChain(tokenizeDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('is deterministic across repeated runs', () => {
    const transcript = oneResponseTranscript('je joue au foot avec mes amis');
    const first = runDetectorChain(tokenizeDetector, PHASE3_DETECTORS, transcript);
    const second = runDetectorChain(tokenizeDetector, PHASE3_DETECTORS, transcript);
    expect(first).toEqual(second);
  });
});

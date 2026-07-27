import { describe, expect, it } from 'vitest';
import { negationDetector } from '../negation';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('negation detector', () => {
  it('flags a dropped ne (subject + verb + pas, no ne)', () => {
    const transcript = oneResponseTranscript('je suis pas content');
    const observations = runDetectorChain(negationDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'negation_incomplete')).toBe(true);
  });

  it('does not flag a complete ne...pas negation', () => {
    const transcript = oneResponseTranscript('je ne suis pas content');
    const observations = runDetectorChain(negationDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('is report-only: markInfluence is always forbidden (spoken ne-drop is normal register)', () => {
    const transcript = oneResponseTranscript('il est jamais en retard');
    const observations = runDetectorChain(negationDetector, PHASE3_DETECTORS, transcript);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((o) => o.markInfluence === 'forbidden')).toBe(true);
  });

  it('does not flag unrelated subject+verb+non-negation-particle sequences', () => {
    const transcript = oneResponseTranscript('je suis content');
    const observations = runDetectorChain(negationDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

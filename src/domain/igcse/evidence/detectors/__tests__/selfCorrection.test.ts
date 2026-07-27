import { describe, expect, it } from 'vitest';
import { selfCorrectionDetector } from '../selfCorrection';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('self-correction detector', () => {
  it('detects a repair marker within a sentence', () => {
    const transcript = oneResponseTranscript("Je vais, euh, je voudrais aller au cinema.");
    const observations = runDetectorChain(selfCorrectionDetector, PHASE3_DETECTORS, transcript);
    expect(observations.length).toBeGreaterThan(0);
  });

  it('is report-only: markInfluence always forbidden (reward achievement, never penalise)', () => {
    const transcript = oneResponseTranscript('je veux dire que je suis content');
    const observations = runDetectorChain(selfCorrectionDetector, PHASE3_DETECTORS, transcript);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((o) => o.markInfluence === 'forbidden')).toBe(true);
  });

  it('does not flag a sentence with no repair marker', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(selfCorrectionDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

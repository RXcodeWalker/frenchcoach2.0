import { describe, expect, it } from 'vitest';
import { auxDetector } from '../auxiliary';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('aux detector', () => {
  it('flags "j\'ai alle" (aller requires etre, not avoir)', () => {
    const transcript = oneResponseTranscript("j'ai alle au marche");
    const observations = runDetectorChain(auxDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'auxiliary_error')).toBe(true);
  });

  it('flags "j\'ai venu" (venir requires etre)', () => {
    const transcript = oneResponseTranscript("j'ai venu hier");
    const observations = runDetectorChain(auxDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'auxiliary_error')).toBe(true);
  });

  it('does not flag correct etre usage', () => {
    const transcript = oneResponseTranscript('je suis alle au marche');
    const observations = runDetectorChain(auxDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('does not flag avoir + a genuine avoir-verb participle', () => {
    const transcript = oneResponseTranscript("j'ai mange une pomme");
    const observations = runDetectorChain(auxDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

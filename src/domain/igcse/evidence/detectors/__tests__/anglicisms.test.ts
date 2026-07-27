import { describe, expect, it } from 'vitest';
import { anglicismsDetector } from '../anglicisms';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('anglicisms detector', () => {
  it('flags "je suis 15 ans" (age is avoir, not etre)', () => {
    const transcript = oneResponseTranscript('je suis 15 ans');
    const observations = runDetectorChain(anglicismsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'anglicism')).toBe(true);
  });

  it('flags "je suis faim" (avoir faim, not etre faim)', () => {
    const transcript = oneResponseTranscript('je suis faim apres le sport');
    const observations = runDetectorChain(anglicismsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'anglicism')).toBe(true);
  });

  it('flags "la librairie" false friend', () => {
    const transcript = oneResponseTranscript('je vais a la librairie pour lire');
    const observations = runDetectorChain(anglicismsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'anglicism')).toBe(true);
  });

  it('does not flag correct "j\'ai 15 ans" / "j\'ai faim"', () => {
    const transcript = oneResponseTranscript("j'ai 15 ans et j'ai faim");
    const observations = runDetectorChain(anglicismsDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

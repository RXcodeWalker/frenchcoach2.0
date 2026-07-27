import { describe, expect, it } from 'vitest';
import { agreementDetector } from '../agreement';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('agreement detector', () => {
  it('flags masculine article + feminine noun (gender error)', () => {
    const transcript = oneResponseTranscript('le maison est grande');
    const observations = runDetectorChain(agreementDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'agreement_gender' && o.value === 'le maison')).toBe(true);
  });

  it('flags feminine article + masculine noun (gender error)', () => {
    const transcript = oneResponseTranscript('la probleme est difficile');
    const observations = runDetectorChain(agreementDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'agreement_gender' && o.value === 'la probleme')).toBe(true);
  });

  it('does not flag a correctly gendered article + noun', () => {
    const transcript = oneResponseTranscript('la maison est grande et le probleme est resolu');
    const observations = runDetectorChain(agreementDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('does not flag nouns outside the curated lexicon (no FP on unknown words)', () => {
    const transcript = oneResponseTranscript('le xylophone est bizarre');
    const observations = runDetectorChain(agreementDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

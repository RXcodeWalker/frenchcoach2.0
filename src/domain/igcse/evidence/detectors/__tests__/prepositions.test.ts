import { describe, expect, it } from 'vitest';
import { prepositionsDetector } from '../prepositions';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('prepositions detector', () => {
  it('flags "jouer le foot" (jouer à required for sports)', () => {
    const transcript = oneResponseTranscript('je veux jouer le foot ce weekend');
    const observations = runDetectorChain(prepositionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'preposition_error')).toBe(true);
  });

  it('flags "écouter à" (écouter is a direct transitive verb)', () => {
    const transcript = oneResponseTranscript('je aime écouter à la musique');
    const observations = runDetectorChain(prepositionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'preposition_error')).toBe(true);
  });

  it('does not flag correct "jouer au foot"', () => {
    const transcript = oneResponseTranscript('je joue au foot le weekend');
    const observations = runDetectorChain(prepositionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

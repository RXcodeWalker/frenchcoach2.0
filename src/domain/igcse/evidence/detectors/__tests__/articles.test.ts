import { describe, expect, it } from 'vitest';
import { articlesDetector } from '../articles';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('articles detector', () => {
  it('flags missing elision (je aime)', () => {
    const transcript = oneResponseTranscript('je aime le foot');
    const observations = runDetectorChain(articlesDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'elision_error')).toBe(true);
  });

  it('flags missing contraction (à le -> au)', () => {
    const transcript = oneResponseTranscript('je vais à le marché');
    const observations = runDetectorChain(articlesDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'contraction_error' && o.value === 'à le')).toBe(true);
  });

  it('flags missing contraction (de les -> des)', () => {
    const transcript = oneResponseTranscript('je parle de les vacances');
    const observations = runDetectorChain(articlesDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'contraction_error' && o.value === 'de les')).toBe(true);
  });

  it('does not flag correct elision/contraction usage', () => {
    const transcript = oneResponseTranscript("j'aime jouer au foot et parler des vacances");
    const observations = runDetectorChain(articlesDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

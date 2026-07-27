import { describe, expect, it } from 'vitest';
import { tenseConsistencyDetector } from '../tenseConsistency';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('tense-consistency detector', () => {
  it('does not flag a single dominant tense with no outliers', () => {
    const transcript = oneResponseTranscript("j'ai mange hier et j'ai regarde un film hier aussi");
    const observations = runDetectorChain(tenseConsistencyDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('does not flag a clear majority with a single rare-singleton outlier', () => {
    const transcript = oneResponseTranscript(
      "j'ai mange hier et j'ai regarde un film et j'ai joue au foot et je vais partir",
    );
    const observations = runDetectorChain(tenseConsistencyDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('flags genuinely mixed tenses with no clear majority', () => {
    const transcript = oneResponseTranscript("j'ai mange et je vais manger et je mangerais");
    const observations = runDetectorChain(tenseConsistencyDetector, PHASE3_DETECTORS, transcript);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations[0].type).toBe('tense_inconsistent');
  });

  it('is report-only (forbidden mark influence — L2 judges genuine ambiguity)', () => {
    const transcript = oneResponseTranscript("j'ai mange et je vais manger et je mangerais");
    const observations = runDetectorChain(tenseConsistencyDetector, PHASE3_DETECTORS, transcript);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((o) => o.markInfluence === 'forbidden')).toBe(true);
  });
});

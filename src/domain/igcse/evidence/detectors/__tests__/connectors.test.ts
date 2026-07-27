import { describe, expect, it } from 'vitest';
import { connectorsDetector } from '../connectors';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('connectors detector', () => {
  it('detects a curated discourse marker', () => {
    const transcript = oneResponseTranscript("Cependant, j'aime le foot.");
    const observations = runDetectorChain(connectorsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.value === 'cependant')).toBe(true);
  });

  it('detects multiple distinct connectors in one response', () => {
    const transcript = oneResponseTranscript("D'abord je mange, ensuite je joue, enfin je dors.");
    const observations = runDetectorChain(connectorsDetector, PHASE3_DETECTORS, transcript);
    const values = observations.map((o) => o.value);
    expect(values).toContain('ensuite');
    expect(values).toContain('enfin');
  });

  it('does not flag a connector embedded inside a longer word (word-boundary check)', () => {
    // "car" is a connector; "carotte" must not trigger a false match.
    const transcript = oneResponseTranscript('je mange une carotte');
    const observations = runDetectorChain(connectorsDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('returns no observations when no connector is present', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(connectorsDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});

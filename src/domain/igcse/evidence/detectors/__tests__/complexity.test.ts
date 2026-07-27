import { describe, expect, it } from 'vitest';
import { complexityDetector } from '../complexity';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('complexity detector', () => {
  it('flags a sentence with a subordinating conjunction as complex', () => {
    const transcript = oneResponseTranscript('Je pense que le film etait bon.');
    const observations = runDetectorChain(complexityDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(1);
    expect(observations[0].value).toBe(true);
  });

  it('does not flag a simple sentence as complex', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(complexityDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(1);
    expect(observations[0].value).toBe(false);
  });

  it('emits one observation per sentence, matching segment count', () => {
    const transcript = oneResponseTranscript("J'aime le foot. Je pense qu'il est important.");
    const observations = runDetectorChain(complexityDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(2);
    expect(observations.map((o) => o.value)).toEqual([false, true]);
  });
});

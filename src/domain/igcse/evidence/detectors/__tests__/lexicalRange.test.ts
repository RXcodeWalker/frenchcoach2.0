import { describe, expect, it } from 'vitest';
import { lexicalRangeDetector } from '../lexicalRange';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('lexical-range detector', () => {
  it('flags a content word outside the curated base list as rare', () => {
    const transcript = oneResponseTranscript('je trouve ça formidable');
    const observations = runDetectorChain(lexicalRangeDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.value === 'formidable')).toBe(true);
  });

  it('does not flag base-list vocabulary as rare', () => {
    const transcript = oneResponseTranscript("j'aime ma famille et mon ecole");
    const observations = runDetectorChain(lexicalRangeDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('does not flag function words or short words', () => {
    const transcript = oneResponseTranscript('je vais bien');
    const observations = runDetectorChain(lexicalRangeDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('deduplicates repeated rare words within one unit', () => {
    const transcript = oneResponseTranscript('formidable formidable formidable');
    const observations = runDetectorChain(lexicalRangeDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(1);
  });
});

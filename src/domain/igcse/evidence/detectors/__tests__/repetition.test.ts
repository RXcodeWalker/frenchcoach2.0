import { describe, expect, it } from 'vitest';
import { repetitionDetector } from '../repetition';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('repetition detector', () => {
  it('flags a content word repeated 3+ times across the transcript', () => {
    const transcript = oneResponseTranscript('le foot est super le foot est genial le foot est tout');
    const observations = runDetectorChain(repetitionDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => String(o.value).startsWith('foot:'))).toBe(true);
  });

  it('does not flag a word used fewer than 3 times', () => {
    const transcript = oneResponseTranscript('le foot est genial et le foot est amusant');
    const observations = runDetectorChain(repetitionDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => String(o.value).startsWith('foot:'))).toBe(false);
  });

  it('excludes ultra-high-frequency pronouns/aux forms from consideration', () => {
    const transcript = oneResponseTranscript('je suis je suis je suis content');
    const observations = runDetectorChain(repetitionDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('cites the full-response span (whole-transcript aggregate)', () => {
    const transcript = oneResponseTranscript('formidable formidable formidable');
    const observations = runDetectorChain(repetitionDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(1);
    expect(observations[0].spans[0].startOffset).toBe(0);
  });
});

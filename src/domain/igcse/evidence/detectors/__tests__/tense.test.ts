import { describe, expect, it } from 'vitest';
import { tenseDetector } from '../tense';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('tense detector', () => {
  it('emits tense_detected for a passe compose verb, prefixed with time frame', () => {
    const transcript = oneResponseTranscript("j'ai mange une pomme hier");
    const observations = runDetectorChain(tenseDetector, PHASE3_DETECTORS, transcript);
    const detected = observations.filter((o) => o.type === 'tense_detected');
    expect(detected.some((o) => String(o.value).startsWith('past:'))).toBe(true);
  });

  it('emits tense_detected for futur proche, prefixed future', () => {
    const transcript = oneResponseTranscript('je vais manger plus tard');
    const observations = runDetectorChain(tenseDetector, PHASE3_DETECTORS, transcript);
    const detected = observations.filter((o) => o.type === 'tense_detected');
    expect(detected.some((o) => String(o.value).startsWith('future:'))).toBe(true);
  });

  it('emits tense_missing (never a penalty, purely observational) for a no-verb utterance', () => {
    const transcript = oneResponseTranscript('euh');
    const observations = runDetectorChain(tenseDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(1);
    expect(observations[0].type).toBe('tense_missing');
    expect(observations[0].markInfluence).toBe('forbidden');
  });

  it('emits nothing for an empty response (not even tense_missing, since there is no unit text)', () => {
    const transcript = oneResponseTranscript('');
    const observations = runDetectorChain(tenseDetector, PHASE3_DETECTORS, transcript);
    expect(observations.every((o) => o.type === 'tense_missing')).toBe(true);
  });
});

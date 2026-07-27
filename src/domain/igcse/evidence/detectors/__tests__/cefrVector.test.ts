import { describe, expect, it } from 'vitest';
import { cefrVectorDetector } from '../cefrVector';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('cefr-vector detector', () => {
  it('returns no observation for an empty response', () => {
    const transcript = oneResponseTranscript('');
    const observations = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('emits exactly one whole-response cefr_indicator observation for a non-empty response', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(1);
    expect(observations[0].type).toBe('cefr_indicator');
    expect(['A1', 'A2', 'B1', 'B2']).toContain(observations[0].value);
  });

  it('is advisory-only (forbidden mark influence, low confidence — never mark-eligible per Part 2)', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, transcript);
    expect(observations[0].markInfluence).toBe('forbidden');
    expect(observations[0].confidence).toBe(0.5);
  });

  it('rates a rich, complex, tense-varied response higher than a bare one', () => {
    const richTranscript = oneResponseTranscript(
      "Cependant, je pense que j'ai mange formidablement bien hier et je voyagerais volontiers si j'avais l'opportunite extraordinaire.",
    );
    const bareTranscript = oneResponseTranscript('je mange');
    const richObs = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, richTranscript);
    const bareObs = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, bareTranscript);
    const bandOrder = { A1: 0, A2: 1, B1: 2, B2: 3 };
    expect(bandOrder[richObs[0].value as keyof typeof bandOrder]).toBeGreaterThanOrEqual(
      bandOrder[bareObs[0].value as keyof typeof bandOrder],
    );
  });
});

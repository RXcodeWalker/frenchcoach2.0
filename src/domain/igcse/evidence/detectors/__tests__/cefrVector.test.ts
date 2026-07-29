import { describe, expect, it } from 'vitest';
import { cefrVectorDetector } from '../cefrVector';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

const COMPONENT_TYPES = ['lexical_density', 'complexity_ratio', 'tense_range'];

describe('cefr-vector detector', () => {
  it('returns no observations for an empty response', () => {
    const transcript = oneResponseTranscript('');
    const observations = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });

  it('emits exactly the three whole-response component observations for a non-empty response', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toHaveLength(3);
    expect(observations.map((o) => o.type).sort()).toEqual([...COMPONENT_TYPES].sort());
    for (const o of observations) {
      expect(typeof o.value).toBe('number');
    }
  });

  it('is advisory-only (forbidden mark influence, low confidence — never mark-eligible per Part 2)', () => {
    const transcript = oneResponseTranscript("J'aime le foot.");
    const observations = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, transcript);
    for (const o of observations) {
      expect(o.markInfluence).toBe('forbidden');
      expect(o.confidence).toBe(0.5);
      expect(o.skillNodeId).toBeNull();
    }
  });

  it('rates a rich, complex, tense-varied response at least as high as a bare one on every component', () => {
    const richTranscript = oneResponseTranscript(
      "Cependant, je pense que j'ai mange formidablement bien hier et je voyagerais volontiers si j'avais l'opportunite extraordinaire.",
    );
    const bareTranscript = oneResponseTranscript('je mange');
    const richObs = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, richTranscript);
    const bareObs = runDetectorChain(cefrVectorDetector, PHASE3_DETECTORS, bareTranscript);

    for (const type of COMPONENT_TYPES) {
      const rich = richObs.find((o) => o.type === type)?.value as number;
      const bare = bareObs.find((o) => o.type === type)?.value as number;
      expect(rich).toBeGreaterThanOrEqual(bare);
    }
  });
});

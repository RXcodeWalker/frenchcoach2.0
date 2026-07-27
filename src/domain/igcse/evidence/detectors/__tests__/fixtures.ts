import type { SpeakingTranscript } from '../../../judgement/types';
import { DetectorRegistry } from '../../framework/registry';
import { runDetectors } from '../../framework/runner';
import type { Detector } from '../../framework/detector';
import type { Observation } from '../../framework/observation';

/** Minimal single-response transcript: one topic1 turn carrying `text`, everything else empty. */
export function oneResponseTranscript(text: string): SpeakingTranscript {
  return {
    contentProvenance: 'original-practice',
    rolePlay: [],
    topicConversations: [
      { conversationId: 'topic1', turns: [{ turnId: 'q1', questionPrompt: 'Question ?', candidateResponse: text }] },
      { conversationId: 'topic2', turns: [] },
    ],
  };
}

/** Runs `detector` (plus its transitive dependsOn chain, resolved from `pool`) and returns its own observations. */
export function runDetectorChain(
  detector: Detector,
  pool: Detector[],
  transcript: SpeakingTranscript,
): Observation[] {
  const byId = new Map(pool.map((d) => [d.id, d]));
  const included = new Map<string, Detector>();

  function include(d: Detector) {
    if (included.has(d.id)) return;
    included.set(d.id, d);
    for (const depId of d.dependsOn) {
      const dep = byId.get(depId);
      if (dep) include(dep);
    }
  }
  include(detector);

  const registry = new DetectorRegistry([...included.values()]);
  const result = runDetectors(registry, { transcript, questionSet: null });
  return result.observations.filter((o) => o.detectorId === detector.id);
}

/**
 * Phase 0 — wraps the 5 pre-framework detectors (counts, duration, fillers,
 * parts, time-frame) onto the Detector contract for registry/runner
 * bookkeeping (§10.7 Phase 0: "no new signals").
 *
 * These detectors do not yet emit typed Observations — the legacy evidence
 * shapes (ResponseCountEvidence, etc.) predate the Observation model, and
 * porting their facts onto Observation is a Phase-3 concern (new detector
 * ids in §10.3, e.g. `counts`/`duration`/`fillers`/`parts`/`time-frame`
 * rows). Phase 0's job is byte-identical output, so `run()` returns `[]` and
 * `buildEvidence.ts` continues to call the underlying pure functions
 * directly for the actual evidence values — the runner only supplies the
 * detectorRuns audit trail (success/failed bookkeeping) in this phase.
 */

import { responseCountsByQuestion } from '../counts';
import { topicConversationDurationByConversation } from '../duration';
import { fillerDensityByQuestion } from '../fillers';
import { rolePlayPartsByTask } from '../parts';
import { deriveExpectedTimeFrameFromCues, detectTimeFrameAlignment } from '../timeFrame';
import type { Detector } from './detector';

export const countsDetector: Detector = {
  id: 'counts',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['response_count'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'advisory',
  run(ctx) {
    responseCountsByQuestion(ctx.transcript);
    return [];
  },
};

export const durationDetector: Detector = {
  id: 'duration',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['topic_duration'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'advisory',
  run(ctx) {
    topicConversationDurationByConversation(ctx.transcript);
    return [];
  },
};

export const fillersDetector: Detector = {
  id: 'fillers',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['filler'],
  baseConfidence: 0.9,
  defaultMarkInfluence: 'advisory',
  run(ctx) {
    fillerDensityByQuestion(ctx.transcript);
    return [];
  },
};

export const partsDetector: Detector = {
  id: 'parts',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['role_play_part'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'advisory',
  run(ctx) {
    rolePlayPartsByTask(ctx.transcript);
    return [];
  },
};

export const timeFrameDetector: Detector = {
  id: 'time-frame',
  version: '1',
  tier: 1,
  dependsOn: [],
  produces: ['time_frame_alignment'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'advisory',
  run(ctx) {
    for (const conversation of ctx.transcript.topicConversations) {
      for (const turn of conversation.turns) {
        const expectedTimeFrame = turn.expectedTimeFrame ?? deriveExpectedTimeFrameFromCues(turn.questionPrompt);
        detectTimeFrameAlignment(expectedTimeFrame, turn.candidateResponse);
      }
    }
    return [];
  },
};

export const LEGACY_DETECTORS: Detector[] = [
  countsDetector,
  durationDetector,
  fillersDetector,
  partsDetector,
  timeFrameDetector,
];

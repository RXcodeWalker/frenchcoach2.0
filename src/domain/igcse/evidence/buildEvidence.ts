import type { SpeakingTranscript } from '../judgement/types';
import { responseCountsByQuestion } from './counts';
import { topicConversationDurationByConversation } from './duration';
import { fillerDensityByQuestion } from './fillers';
import { LEGACY_DETECTORS } from './framework/legacyDetectors';
import { DetectorRegistry } from './framework/registry';
import { runDetectors } from './framework/runner';
import { rolePlayPartsByTask } from './parts';
import { deriveExpectedTimeFrameFromCues, detectTimeFrameAlignment } from './timeFrame';
import type { EvidenceProfile, EvidenceProfileSubset } from './types';

const LEGACY_REGISTRY = new DetectorRegistry(LEGACY_DETECTORS);

/**
 * Phase 0 (§10.7): delegates to the registry/runner for detector bookkeeping
 * (ordering, per-detector run state), while the actual evidence values still
 * come from the same pure functions the wrapped detectors call — see
 * framework/legacyDetectors.ts for why `run()` returns `[]` in this phase.
 * Output is byte-identical to the pre-Phase-0 implementation by construction.
 */
export function buildEvidenceSubset(transcript: SpeakingTranscript): EvidenceProfileSubset {
  runDetectors(LEGACY_REGISTRY, { transcript, questionSet: null });

  const timeFrameAlignmentByQuestion = transcript.topicConversations.flatMap((conversation) =>
    conversation.turns.map((turn) => {
      const expectedTimeFrame =
        turn.expectedTimeFrame ?? deriveExpectedTimeFrameFromCues(turn.questionPrompt);
      const { detectedTimeFrame, alignment } = detectTimeFrameAlignment(
        expectedTimeFrame,
        turn.candidateResponse,
      );

      return {
        questionId: `${conversation.conversationId}:${turn.turnId}`,
        expectedTimeFrame,
        detectedTimeFrame,
        alignment,
      };
    }),
  );

  return {
    timeFrameAlignmentByQuestion,
    responseCountsByQuestion: responseCountsByQuestion(transcript),
    fillerDensityByQuestion: fillerDensityByQuestion(transcript),
    rolePlayPartsByTask: rolePlayPartsByTask(transcript),
    topicConversationDurationByConversation: topicConversationDurationByConversation(transcript),
  };
}

/**
 * Phase 1 (§10.7 Phase 1 / §9.4 R1): the single evidence build site's output
 * type. `scoreAttempt` calls this once and injects the same object into both
 * `scoreSpeaking` (prompt) and `buildScoringEnvelope` (snapshot) — see
 * scoreAttempt.ts. Additive over `buildEvidenceSubset`: the five subset
 * fields are computed identically (byte-identical golden), wrapped with the
 * Phase-1 bookkeeping fields that stay empty until Phase 3 detectors exist.
 */
export function buildEvidenceProfile(transcript: SpeakingTranscript): EvidenceProfile {
  return {
    schemaVersion: 'evidence-profile-v1',
    observations: [],
    features: {},
    detectorRuns: [],
    detectorVersions: {},
    ...buildEvidenceSubset(transcript),
  };
}

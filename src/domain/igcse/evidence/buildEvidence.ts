import type { SessionQuestionSet } from '../session/types';
import type { SpeakingTranscript } from '../judgement/types';
import { responseCountsByQuestion } from './counts';
import { topicConversationDurationByConversation } from './duration';
import { projectFeatures } from './features/project';
import { fillerDensityByQuestion } from './fillers';
import type { Detector } from './framework/detector';
import { LEGACY_DETECTORS } from './framework/legacyDetectors';
import { PHASE3_DETECTORS } from './framework/phase3Detectors';
import { DetectorRegistry } from './framework/registry';
import { runDetectors } from './framework/runner';
import { rolePlayPartsByTask } from './parts';
import { deriveExpectedTimeFrameFromCues, detectTimeFrameAlignment } from './timeFrame';
import type { EvidenceProfile, EvidenceProfileSubset } from './types';

const LEGACY_REGISTRY = new DetectorRegistry(LEGACY_DETECTORS);
/**
 * Phase 3 (§10.7): the combined fleet — legacy detectors (byte-identical
 * bookkeeping-only `run()`, §10.7 Phase 0) plus the full new detector set
 * (§10.3), sharing one tier-DAG registry so Phase-3 detectors that declare no
 * dependsOn on a legacy id never accidentally collide with one.
 */
const FULL_REGISTRY = new DetectorRegistry([...LEGACY_DETECTORS, ...PHASE3_DETECTORS]);

/**
 * Phase 5 (§10.6): the registered fleet, exposed read-only so L3 and the
 * `no-uncalibrated-influence` CI guard can enumerate every detector's declared
 * mark-influence. Exported as a list rather than the registry itself to keep
 * `FULL_REGISTRY` the sole orchestration entry point (§9.4 R1 — the runner must
 * not acquire a second caller).
 */
export function registeredDetectors(): readonly Detector[] {
  return FULL_REGISTRY.list();
}

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
 * fields are computed identically (byte-identical golden).
 *
 * Phase 3 (§10.7 Phase 3): runs the full detector fleet (legacy + new) once
 * via `FULL_REGISTRY`, populating `observations`/`detectorRuns`/
 * `detectorVersions`/`features`. This is additive-only — none of these four
 * fields are in the L2 prompt allow-list (judgement/prompt.ts), so no mark
 * moves. `questionSet` is optional (null at every current call site except
 * where a caller passes one) — see DetectorContext.questionSet.
 */
export function buildEvidenceProfile(
  transcript: SpeakingTranscript,
  questionSet: SessionQuestionSet | null = null,
): EvidenceProfile {
  const { observations, detectorRuns } = runDetectors(FULL_REGISTRY, { transcript, questionSet });
  const detectorVersions = Object.fromEntries(
    FULL_REGISTRY.list().map((detector) => [detector.id, detector.version]),
  );
  const subset = buildEvidenceSubset(transcript);

  return {
    schemaVersion: 'evidence-profile-v1',
    observations,
    features: projectFeatures({ observations, fillerDensityByQuestion: subset.fillerDensityByQuestion }),
    detectorRuns,
    detectorVersions,
    ...subset,
  };
}

/**
 * S4 orchestration: transcriptStore.load -> toSpeakingTranscript ->
 * buildEvidenceSubset -> scoreSpeaking -> buildScoringEnvelope.
 *
 * Errors (ProvenanceError, JudgementValidationError) propagate unchanged —
 * the batch harness decides how to handle a failed attempt, not this function.
 *
 * createJudge is a factory dependency, called fresh once per attempt (never
 * memoized/shared) — see anthropicJudge.ts header for the race this avoids.
 */

import * as crypto from 'node:crypto';
import { buildEvidenceProfile } from '../../src/domain/igcse/evidence/buildEvidence';
import { EVIDENCE_DETECTOR_VERSION } from '../../src/domain/igcse/evidence/version';
import { buildScoringEnvelope } from '../../src/domain/igcse/envelope/buildEnvelope';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';
import { runGuardrails } from '../../src/domain/igcse/guardrails/runGuardrails';
import { GUARDRAILS_VERSION } from '../../src/domain/igcse/guardrails/version';
import { scoreSpeaking } from '../../src/domain/igcse/judgement/scoreSpeaking';
import type { Judge, SpeakingAssessment } from '../../src/domain/igcse/judgement/types';
import { SCORING_PROMPT_VERSION } from '../../src/domain/igcse/judgement/version';
import { RUBRIC_VERSION } from '../../src/domain/igcse/rubric';
import { toSpeakingTranscript } from '../../src/domain/igcse/stt/project/toSpeakingTranscript';
import { summariseQuality } from '../../src/domain/igcse/stt/quality/summariseQuality';
import type { SessionQuestionSet } from '../../src/domain/igcse/stt/types';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import { resolveScoringEngineVersion } from './engineVersion';
import type { LlmProviderName } from '../../src/domain/igcse/envelope/types';
import { logStage } from './observability/logger';

export interface CreateJudgeResult {
  judge: Judge;
  getLastCallMetadata: () => { provider: LlmProviderName; model: string; responseId?: string } | undefined;
}

export interface ScoreAttemptDeps {
  transcriptStore: TranscriptStore;
  createJudge: () => CreateJudgeResult;
  /**
   * Override the version stack read into every envelope produced through
   * these deps. Defaults to the real constants when omitted. Exists so tests
   * (and only tests) can inject a different evidenceDetectorVersion between
   * an original scoring call and a later replayEnvelope call, proving replay
   * recomputes evidence under whatever version is current rather than
   * reusing a frozen snapshot.
   */
  versions?: {
    rubricVersion?: string;
    scoringEngineVersion?: string;
    evidenceDetectorVersion?: string;
    scoringPromptVersion?: string;
    guardrailsVersion?: string;
  };
}

export interface ScoreAttemptInput {
  sessionId: string;
  questionSet: SessionQuestionSet;
  regradedFrom?: string;
}

/** Score one session, producing a fresh ScoringEnvelope. Does not persist it. */
export async function scoreAttempt(
  deps: ScoreAttemptDeps,
  input: ScoreAttemptInput,
): Promise<ScoringEnvelope> {
  const attemptId = crypto.randomUUID();

  const session = await logStage(attemptId, 'transcriptStore.load', () => deps.transcriptStore.load(input.sessionId));
  const speakingTranscript = toSpeakingTranscript(session, input.questionSet);
  // Single build site (§9.4 R1): this same evidenceProfile object is injected
  // into both scoreSpeaking (the prompt the LLM sees) and buildScoringEnvelope
  // (the audited snapshot) — so they can never desync.
  const evidenceProfile = await logStage(attemptId, 'buildEvidenceProfile', async () =>
    buildEvidenceProfile(speakingTranscript),
  );

  const { judge, getLastCallMetadata } = deps.createJudge();
  const assessment: SpeakingAssessment = await logStage(attemptId, 'scoreSpeaking', () =>
    scoreSpeaking(speakingTranscript, evidenceProfile, judge),
  );
  const llmMetadata = getLastCallMetadata();
  if (!llmMetadata) {
    throw new Error('scoreAttempt: createJudge() instance produced no call metadata after scoreSpeaking');
  }

  const guardrailReport = await logStage(attemptId, 'runGuardrails', async () =>
    runGuardrails(assessment, evidenceProfile, speakingTranscript),
  );

  const envelope = buildScoringEnvelope({
    attemptId,
    sessionId: input.sessionId,
    scoredAt: new Date().toISOString(),
    transcript: speakingTranscript,
    assessment,
    evidenceProfile,
    stt: session.stt,
    transcriptVersion: {
      schemaVersion: session.schemaVersion,
      assemblerVersion: session.assemblerVersion,
    },
    transcriptQuality: summariseQuality(session),
    userCorrected: session.userCorrected,
    questionSetId: session.questionSetId,
    questionSetHash: session.questionSetHash,
    llm: {
      provider: llmMetadata.provider,
      model: llmMetadata.model,
      selfConsistencyRuns: 1,
      ...(llmMetadata.responseId !== undefined ? { responseId: llmMetadata.responseId } : {}),
    },
    versions: {
      rubricVersion: deps.versions?.rubricVersion ?? RUBRIC_VERSION,
      scoringEngineVersion: deps.versions?.scoringEngineVersion ?? resolveScoringEngineVersion(),
      evidenceDetectorVersion: deps.versions?.evidenceDetectorVersion ?? EVIDENCE_DETECTOR_VERSION,
      scoringPromptVersion: deps.versions?.scoringPromptVersion ?? SCORING_PROMPT_VERSION,
      guardrailsVersion: deps.versions?.guardrailsVersion ?? GUARDRAILS_VERSION,
    },
    guardrailTriggers: guardrailReport.triggers.map((t) => t.id),
    ...(input.regradedFrom !== undefined ? { regradedFrom: input.regradedFrom } : {}),
  });

  return envelope;
}

/**
 * Replay source-of-truth policy: transcriptSnapshot/evidenceProfileSnapshot on
 * a prior envelope are audit/debug artifacts only — NEVER read back in as
 * scoring inputs. replayEnvelope uses only prior.sessionId to reload the
 * transcript fresh via deps.transcriptStore.load, then re-runs the full
 * pipeline under whatever code/version constants are current at replay time.
 * This guarantees the new envelope's declared evidenceDetectorVersion always
 * matches the evidence it actually contains.
 */
export async function replayEnvelope(
  deps: ScoreAttemptDeps,
  prior: ScoringEnvelope,
  questionSet: SessionQuestionSet,
): Promise<ScoringEnvelope> {
  return scoreAttempt(deps, {
    sessionId: prior.sessionId,
    questionSet,
    regradedFrom: prior.attemptId,
  });
}

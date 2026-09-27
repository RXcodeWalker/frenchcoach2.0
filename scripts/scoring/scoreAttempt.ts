/**
 * S4 orchestration: transcriptStore.load -> toSpeakingTranscript ->
 * buildEvidenceSubset -> (L2 main call || L2 QoL call) -> runGuardrails -> buildScoringEnvelope.
 *
 * scoring-prompt-v0.6: L2 is two judge calls run CONCURRENTLY —
 * 'rolePlayCommunication' and 'qualityOfLanguage' — so wall time is roughly
 * the slower call, not the sum.
 *
 * Errors (ProvenanceError, JudgementValidationError) propagate unchanged —
 * the batch harness decides how to handle a failed attempt, not this function.
 * One exception: a JudgementValidationError (the judge replied, but the reply
 * failed parsing/validation) gets exactly one retry with a fresh createJudge()
 * instance before it propagates. Each call kind has its OWN retry, so a bad
 * QoL reply never re-runs role play/Communication (and vice versa). Failures
 * are logged, and the number of judge calls per kind is recorded as
 * `judgeAttempts` in the scoring logs (never in the envelope). A terminal
 * failure of either call fails the whole attempt — no partial marks.
 *
 * createJudge is a factory dependency, called fresh once per judge call
 * (never memoized/shared) — see anthropicJudge.ts header for the race this
 * avoids; with two concurrent calls, sharing an instance would let one call's
 * metadata overwrite the other's.
 */

import * as crypto from 'node:crypto';
import { buildEvidenceProfile } from '../../src/domain/igcse/evidence/buildEvidence';
import { EVIDENCE_DETECTOR_VERSION } from '../../src/domain/igcse/evidence/version';
import { buildScoringEnvelope } from '../../src/domain/igcse/envelope/buildEnvelope';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';
import { runGuardrails } from '../../src/domain/igcse/guardrails/runGuardrails';
import { GUARDRAILS_VERSION } from '../../src/domain/igcse/guardrails/version';
import {
  combineAssessment,
  JudgementValidationError,
  scoreQualityOfLanguage,
  scoreRolePlayAndCommunication,
} from '../../src/domain/igcse/judgement/scoreSpeaking';
import type { Judge, JudgeKind } from '../../src/domain/igcse/judgement/types';
import { SCORING_PROMPT_VERSION } from '../../src/domain/igcse/judgement/version';
import { RUBRIC_VERSION } from '../../src/domain/igcse/rubric';
import { toSpeakingTranscript } from '../../src/domain/igcse/stt/project/toSpeakingTranscript';
import { summariseQuality } from '../../src/domain/igcse/stt/quality/summariseQuality';
import type { SessionQuestionSet } from '../../src/domain/igcse/stt/types';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import { resolveScoringEngineVersion } from './engineVersion';
import type { LlmProvenance, LlmProviderName } from '../../src/domain/igcse/envelope/types';
import { logJudgeAttempts, logJudgeValidationFailure, logStage } from './observability/logger';

/**
 * Judge calls per L2 call kind per scoring attempt: the first, plus one retry
 * on a JudgementValidationError. A provider-call failure is not retried here —
 * judgeFactory.ts already falls back from Gemini to Groq for those.
 */
const MAX_JUDGE_ATTEMPTS = 2;

export interface JudgeCallMetadata {
  provider: LlmProviderName;
  model: string;
  responseId?: string;
}

export interface CreateJudgeResult {
  judge: Judge;
  getLastCallMetadata: () => JudgeCallMetadata | undefined;
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
  // into both the main L2 call (the prompt the LLM sees) and buildScoringEnvelope
  // (the audited snapshot) — so they can never desync.
  const evidenceProfile = await logStage(attemptId, 'buildEvidenceProfile', async () =>
    buildEvidenceProfile(speakingTranscript),
  );

  const judgeCall = <T>(kind: JudgeKind, call: (judge: Judge) => Promise<T>) =>
    runJudgeCall(deps, attemptId, input.sessionId, kind, call);
  // Concurrent: each call gets its own fresh judge instance(s) and its own retry.
  const [main, qol] = await Promise.all([
    judgeCall('rolePlayCommunication', (judge) =>
      scoreRolePlayAndCommunication(speakingTranscript, evidenceProfile, judge),
    ),
    judgeCall('qualityOfLanguage', (judge) => scoreQualityOfLanguage(speakingTranscript, judge)),
  ]);
  const assessment = combineAssessment(main.result, qol.result);

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
    llm: toLlmProvenance(main.metadata),
    // Recorded separately: after a Gemini→Groq fallback on one call only, the
    // two calls can be served by different providers.
    qualityOfLanguageLlm: toLlmProvenance(qol.metadata),
    versions: {
      rubricVersion: deps.versions?.rubricVersion ?? RUBRIC_VERSION,
      scoringEngineVersion: deps.versions?.scoringEngineVersion ?? resolveScoringEngineVersion(),
      evidenceDetectorVersion: deps.versions?.evidenceDetectorVersion ?? EVIDENCE_DETECTOR_VERSION,
      scoringPromptVersion: deps.versions?.scoringPromptVersion ?? SCORING_PROMPT_VERSION,
      guardrailsVersion: deps.versions?.guardrailsVersion ?? GUARDRAILS_VERSION,
    },
    guardrailTriggers: guardrailReport.triggers.map((t) => t.id),
    // Workstream C: L3's clamps reach the envelope, where buildScoringEnvelope
    // applies them to the criterion mark/band and the total. Always [] until a
    // detector is promoted to `eligible` with a sourced ceiling.
    criterionAdjustments: guardrailReport.adjustments,
    ...(input.regradedFrom !== undefined ? { regradedFrom: input.regradedFrom } : {}),
  });

  return envelope;
}

function toLlmProvenance(metadata: JudgeCallMetadata): LlmProvenance {
  return {
    provider: metadata.provider,
    model: metadata.model,
    selfConsistencyRuns: 1,
    ...(metadata.responseId !== undefined ? { responseId: metadata.responseId } : {}),
  };
}

const STAGE_BY_KIND: Record<JudgeKind, string> = {
  rolePlayCommunication: 'scoreRolePlayAndCommunication',
  qualityOfLanguage: 'scoreQualityOfLanguage',
};

/**
 * One L2 call kind with its own retry: a fresh createJudge() per judge call,
 * including the retry — never reuse an instance (see the header).
 */
async function runJudgeCall<T>(
  deps: ScoreAttemptDeps,
  attemptId: string,
  sessionId: string,
  kind: JudgeKind,
  call: (judge: Judge) => Promise<T>,
): Promise<{ result: T; metadata: JudgeCallMetadata }> {
  for (let judgeAttempts = 1; ; judgeAttempts += 1) {
    const { judge, getLastCallMetadata } = deps.createJudge();
    let result: T;
    try {
      result = await logStage(attemptId, STAGE_BY_KIND[kind], () => call(judge));
    } catch (err) {
      if (!(err instanceof JudgementValidationError)) throw err;
      logJudgeValidationFailure(attemptId, sessionId, kind, judgeAttempts, err);
      if (judgeAttempts >= MAX_JUDGE_ATTEMPTS) throw err;
      continue;
    }
    logJudgeAttempts(attemptId, sessionId, kind, judgeAttempts);
    const metadata = getLastCallMetadata();
    if (!metadata) {
      throw new Error(`scoreAttempt: createJudge() instance produced no call metadata after the ${kind} call`);
    }
    return { result, metadata };
  }
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

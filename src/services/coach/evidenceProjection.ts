// ── Coach MVP: evidence projection (Phase 2) ───────────────────────────────
// Replaces the guts of evidenceBuilder.ts. Converts a completed answer into
// EvidenceEvents by first building an EvidenceProfile-shaped Observation log
// (deriveNodeOutcome, §10.4), then projecting that into the existing
// EvidenceEvent shape the belief reducer already consumes.
//
// Today there is no live-app producer of a real L1 EvidenceProfile (that
// pipeline — src/domain/igcse/evidence/ — only runs inside the offline batch
// scorer, scripts/scoring/scoreAttempt.ts, and its `observations` array is
// always empty). wrapFeedbackAsEvidenceProfile is the temporary bridge: it
// packages today's FeedbackV2 issues/grammar errors into the same
// Observation[] shape, resolved through the canonical nodeMap, so
// deriveNodeOutcome runs against real (if today FeedbackV2-sourced) data now
// and will pick up richer detector observations automatically once a live L1
// pipeline exists — no seam rewrite required.

import type { FeedbackV2, Question, AvoidanceSignal } from '../../types';
import type {
  EvidenceEvent,
  EvidenceReliability,
  EvidenceEvaluator,
} from '../../types/evidence';
import type { Observation, Span } from '../../domain/igcse/evidence/framework/observation';
import { nodeForIssueCategory, nodeForGrammarTheme } from '../../domain/igcse/evidence/framework/nodeMap';
import { LANGUAGE_SUCCESS_SCORE, isUnscored } from '../../domain/scoring';
import { LEARNER_ID } from './learnerId';

const RUBRIC_VERSION = 'coach-mvp-1';
const BRIDGE_DETECTOR_ID = 'feedbackv2-bridge';
const BRIDGE_DETECTOR_VERSION = 'bridge-v1';

export interface BuildEvidenceArgs {
  sessionId: string;
  question: Question | null;
  feedback: FeedbackV2;
  avoidanceSignals: AvoidanceSignal[];
  transcript: string;
  finalScore: number;
  mode: string;
  topicKey?: string;
  engine?: string;
}

// ── Deterministic observation identity (§9.2) ──────────────────────────────
// Content hash of the composite key, never a timestamp or random value, so
// identical input + versions yields byte-identical ids.

function canonicalSpanKey(spans: Span[]): string {
  return spans.map(s => `${s.startOffset}:${s.endOffset}`).join(',');
}

/**
 * Deterministic, non-cryptographic content hash (FNV-1a, 32-bit) of the
 * composite identity key — never a timestamp or random value (§9.2). Plain
 * FNV-1a rather than crypto.subtle.digest because this id must be computed
 * synchronously from the browser-side session orchestrator; collision
 * resistance is not a security property here, only determinism is.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function computeObservationId(
  detectorId: string,
  detectorVersion: string,
  type: string,
  spans: Span[],
  value: string | number | boolean,
): string {
  const key = `${detectorId}|${detectorVersion}|${type}|${canonicalSpanKey(spans)}|${String(value)}`;
  return fnv1a(key);
}

function fullResponseSpan(transcript: string): Span[] {
  return [{ startOffset: 0, endOffset: transcript.length }];
}

/**
 * Bridge: package FeedbackV2 issues + legacy grammar errors into
 * Observation[], resolved through the canonical nodeMap. `markInfluence` is
 * always 'forbidden' — this bridge feeds coaching only, never scoring.
 */
export function wrapFeedbackAsEvidenceObservations(
  feedback: FeedbackV2,
  transcript: string,
): Observation[] {
  const observations: Observation[] = [];
  const spans = fullResponseSpan(transcript);

  for (const issue of feedback.issues ?? []) {
    const skillNodeId = nodeForIssueCategory(issue.category);
    if (!skillNodeId) continue;
    observations.push({
      observationId: computeObservationId(
        BRIDGE_DETECTOR_ID, BRIDGE_DETECTOR_VERSION, `issue:${issue.category}`, spans, issue.id,
      ),
      detectorId: BRIDGE_DETECTOR_ID,
      detectorVersion: BRIDGE_DETECTOR_VERSION,
      type: `issue:${issue.category}`,
      value: issue.id,
      spans,
      confidence: issue.confidence ?? 0.7,
      markInfluence: 'forbidden',
      skillNodeId,
    });
  }

  const grammarErrors = [
    ...(feedback.grammar?.critical ?? []),
    ...(feedback.grammar?.polish ?? []),
  ];
  for (const err of grammarErrors) {
    const skillNodeId = nodeForGrammarTheme(err.theme ?? '');
    if (!skillNodeId) continue;
    observations.push({
      observationId: computeObservationId(
        BRIDGE_DETECTOR_ID, BRIDGE_DETECTOR_VERSION, `grammar:${err.theme}`, spans, err.correction,
      ),
      detectorId: BRIDGE_DETECTOR_ID,
      detectorVersion: BRIDGE_DETECTOR_VERSION,
      type: `grammar:${err.theme}`,
      value: err.correction,
      spans,
      confidence: err.severity === 'major' ? 0.8 : 0.6,
      markInfluence: 'forbidden',
      skillNodeId,
    });
  }

  return observations;
}

/** True when an Observation.type represents an issue (as opposed to a neutral feature). */
function isIssueType(type: string): boolean {
  return type.startsWith('issue:') || type.startsWith('grammar:');
}

/**
 * §10.4: per node, from one attempt's observation log, was this node a
 * success, a failure, or not attempted? A node "fails" when at least one
 * confident (>= 0.7) issue observation targets it.
 */
export function deriveNodeOutcome(
  nodeId: string,
  observations: Observation[],
): 'success' | 'failure' | 'not_attempted' {
  const issues = observations.filter(
    o => o.skillNodeId === nodeId && isIssueType(o.type) && o.confidence >= 0.7,
  );
  if (issues.length > 0) return 'failure';
  const attempted = observations.some(o => o.skillNodeId === nodeId);
  return attempted ? 'success' : 'not_attempted';
}

function evaluatorFor(feedback: FeedbackV2): EvidenceEvaluator {
  const actual = feedback.engineMeta?.actualEngine;
  if (actual === 'offline') return 'offline';
  if (actual === 'gemini' || actual === 'groq') return 'llm';
  return 'heuristic';
}

/** Word-count and evaluator drive how much we trust this observation. */
function computeReliability(feedback: FeedbackV2, wordCount: number): EvidenceReliability {
  const evaluator = evaluatorFor(feedback);

  const taskValidity =
    wordCount === 0 ? 0.1 :
    wordCount < 4 ? 0.3 :
    wordCount < 10 ? 0.6 :
    0.9;

  const signalQuality =
    wordCount === 0 ? 0.2 :
    wordCount < 10 ? 0.5 :
    0.9;

  const baseConfidence =
    typeof feedback.confidence === 'number' ? feedback.confidence :
    evaluator === 'offline' ? 0.5 :
    evaluator === 'llm' ? 0.8 :
    0.4;

  return {
    assessmentConfidence: Math.max(0, Math.min(1, baseConfidence)),
    taskValidity,
    signalQuality,
    evaluator,
    rubricVersion: RUBRIC_VERSION,
  };
}

function summarise(feedback: FeedbackV2): string {
  return (
    feedback.biggest_opportunity ||
    feedback.best_moment ||
    feedback.examiner?.oneLiner ||
    `CEFR ${feedback.cefrLevel}, overall ${feedback.scores.overall}/10`
  );
}

/**
 * Build this attempt's EvidenceEvents by first constructing the observation
 * log (today: the FeedbackV2 bridge; future: a real EvidenceProfile), then
 * projecting via deriveNodeOutcome. Result shape is unchanged from the
 * pre-Phase-2 evidenceBuilder so beliefReducer/coachStorage need no changes.
 */
export function buildEvidence(args: BuildEvidenceArgs): EvidenceEvent[] {
  const { feedback, avoidanceSignals, transcript } = args;
  const occurredAt = new Date().toISOString();
  const wordCount = feedback.wordCount ?? transcript.trim().split(/\s+/).filter(Boolean).length;

  const observations = wrapFeedbackAsEvidenceObservations(feedback, transcript);
  const targetNodeIds = [...new Set(observations.map(o => o.skillNodeId).filter((id): id is string => id !== null))];

  // Avoidance signals are behavioral, not language observations — still
  // resolved via the same node vocabulary so both event types agree.
  for (const signal of avoidanceSignals) {
    if (!targetNodeIds.includes(signal.skillId)) targetNodeIds.push(signal.skillId);
  }

  const reliability = computeReliability(feedback, wordCount);
  const issues = feedback.issues ?? [];
  const grammarErrors = [
    ...(feedback.grammar?.critical ?? []),
    ...(feedback.grammar?.polish ?? []),
  ];
  const criticalIssueCount = feedback.grammar?.critical?.length ?? 0;

  // deriveNodeOutcome drives whether this attempt counts as success/failure
  // per node; the event-level result.success stays a single scalar (the
  // reducer only reads result.success, not per-node outcomes) — computed as
  // "no node targeted by this attempt failed".
  const anyNodeFailed = targetNodeIds.some(
    nodeId => deriveNodeOutcome(nodeId, observations) === 'failure',
  );
  // An unscored (offline, no-LLM) attempt has no real finalScore to fall back
  // on — args.finalScore is a placeholder 0 in that case, and comparing it
  // against LANGUAGE_SUCCESS_SCORE would record a clean, zero-observation
  // response as a belief "failure" purely because it was never graded.
  const unscored = isUnscored(feedback);

  const events: EvidenceEvent[] = [];

  events.push({
    id: computeObservationId('evidence-event', BRIDGE_DETECTOR_VERSION, 'language', fullResponseSpan(transcript), args.sessionId),
    learnerId: LEARNER_ID,
    occurredAt,
    sourceSessionId: args.sessionId,
    evidenceType: 'language',
    targetNodeIds,
    observation: {
      transcript: transcript.slice(0, 500),
      issueIds: issues.map(i => i.id).filter(Boolean),
      issueCategories: issues.map(i => i.category),
      avoidanceSkillIds: avoidanceSignals.map(s => s.skillId),
      feedbackSummary: summarise(feedback),
    },
    result: {
      ...(unscored ? {} : { score: args.finalScore }),
      success: observations.length > 0
        ? !anyNodeFailed
        : unscored
        ? undefined
        : args.finalScore >= LANGUAGE_SUCCESS_SCORE,
      wordCount,
      issueCount: issues.length + grammarErrors.length,
      criticalIssueCount,
    },
    reliability,
    context: {
      mode: args.mode,
      topicKey: args.topicKey,
      questionId: args.question?.id,
      questionText: args.question?.text?.slice(0, 200),
      timed: args.mode === 'exam',
      engine: args.engine,
    },
  });

  // Separate behavioral evidence event for avoidance, so it can be weighted
  // independently from accuracy in the recommendation engine.
  if (avoidanceSignals.length > 0) {
    events.push({
      id: computeObservationId('evidence-event', BRIDGE_DETECTOR_VERSION, 'behavior', fullResponseSpan(transcript), args.sessionId),
      learnerId: LEARNER_ID,
      occurredAt,
      sourceSessionId: args.sessionId,
      evidenceType: 'behavior',
      targetNodeIds: avoidanceSignals.map(s => s.skillId),
      observation: {
        avoidanceSkillIds: avoidanceSignals.map(s => s.skillId),
        feedbackSummary: avoidanceSignals[0]?.observation,
      },
      result: {
        avoided: true,
        score: args.finalScore,
        wordCount,
      },
      reliability: {
        ...reliability,
        evaluator: 'heuristic',
      },
      context: {
        mode: args.mode,
        topicKey: args.topicKey,
        questionId: args.question?.id,
        timed: args.mode === 'exam',
        engine: args.engine,
      },
    });
  }

  return events;
}

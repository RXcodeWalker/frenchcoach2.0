// ── Coach MVP: pronunciation evidence bridge (accent-analyzer plan Phase 5) ──
// Converts a completed PronunciationAssessment into EvidenceEvents so accent
// practice contributes to the coach's evidence log, same as any other
// attempt (evidenceProjection.ts's FeedbackV2 bridge).
//
// Node namespace: `pron:*` (e.g. `pron:liaison`, `pron:overall`). These ids
// are NEVER added to SKILL_DEFS (services/coaching/diagnosticEngine.ts) —
// that table is the audited 14 grammar categories. projectEvidenceBeliefSnapshot
// (beliefReducer.ts) looks up `SKILL_DEFS[nodeId]` and silently skips any id
// it doesn't recognise, so pron:* events are captured in the evidence log
// (visible to anything reading getEvidenceEvents directly, and folded by
// reduceEvidenceToBeliefState into its internal per-node accumulator) without
// ever surfacing in the belief snapshot, recommendation engine, skill graph,
// or skill-tree UI — none of which have been extended to know about pron:*
// on purpose. That is the "never merged into the 14 grammar categories"
// rule, enforced structurally (an unrecognised node id can never produce a
// snapshot entry) rather than by convention alone.
//
// evidenceType is 'language', not the union's unused 'speech' member —
// reduceEvidenceToBeliefState only has fold logic for 'language' and
// 'behavior' today; a 'speech' event would be silently skipped by the
// `if (event.evidenceType !== 'language') continue` branch, which would
// defeat "captured in the log" (the log would have the event, but nothing
// would ever read it). Using 'language' costs nothing new: the SKILL_DEFS
// guard in projectEvidenceBeliefSnapshot is what actually prevents merging,
// not the evidenceType tag.
//
// Evaluator is always 'speech_model' (see types/evidence.ts's EvidenceEvaluator
// union, added for this purpose) — Azure/whisper-heuristic pronunciation
// scoring is a fundamentally different measurement instrument from the
// FeedbackV2 offline/llm/heuristic evaluators and must not be conflated with
// them in computeEventWeight's EVALUATOR_CAPS.

import type { PronunciationAssessment } from '../../domain/pronunciation/types';
import type { EvidenceEvent, EvidenceReliability } from '../../types/evidence';
import { LEARNER_ID } from './learnerId';

const RUBRIC_VERSION = 'pronunciation-evidence-1';

export const PRON_OVERALL_NODE_ID = 'pron:overall';

export function pronCategoryNodeId(category: string): string {
  return `pron:${category}`;
}

export interface BuildPronunciationEvidenceArgs {
  attemptId: string;
  sessionId: string;
  assessment: PronunciationAssessment;
  targetText: string;
  mode: string; // caller's activity mode, e.g. 'accent-analyzer' — distinct from assessment.mode ('scripted' | 'freeform')
}

/**
 * couldNotAssess attempts carry no measurement at all (plan §15: score is
 * null exactly when couldNotAssess is true) — never fabricate a node outcome
 * from them. Returns an empty array rather than a low-confidence event.
 */
export function buildPronunciationEvidence(args: BuildPronunciationEvidenceArgs): EvidenceEvent[] {
  const { assessment } = args;
  if (assessment.couldNotAssess || assessment.score === null) return [];

  const occurredAt = new Date().toISOString();
  const score = assessment.score;

  // Reliability mirrors the assessment's own confidence rather than a fixed
  // constant — a low-confidence Azure call (noisy mic, poor SNR) should
  // contribute less to the belief model, same principle as
  // evidenceProjection.ts's minIssueConfidence weighting.
  const assessmentConfidence = assessment.confidence?.overall ?? (assessment.provider === 'azure' ? 0.7 : 0.4);
  const signalQuality = assessment.audioQuality?.snrDb != null
    ? Math.max(0, Math.min(1, assessment.audioQuality.snrDb / 30))
    : assessment.provider === 'azure' ? 0.7 : 0.4;

  const reliability: EvidenceReliability = {
    assessmentConfidence: Math.max(0, Math.min(1, assessmentConfidence)),
    taskValidity: 0.9, // a completed, assessable recording is a valid task by construction here
    signalQuality,
    evaluator: 'speech_model',
    rubricVersion: RUBRIC_VERSION,
  };

  const findingNodeIds = [
    ...new Set((assessment.phonologicalFindings ?? []).map(f => pronCategoryNodeId(f.category))),
  ];
  const targetNodeIds = [PRON_OVERALL_NODE_ID, ...findingNodeIds];

  const events: EvidenceEvent[] = [];

  events.push({
    id: `${args.attemptId}:overall`,
    learnerId: LEARNER_ID,
    occurredAt,
    sourceSessionId: args.sessionId,
    sourceAttemptId: args.attemptId,
    evidenceType: 'language',
    targetNodeIds,
    observation: {
      transcript: assessment.transcript.slice(0, 500),
      issueCategories: (assessment.phonologicalFindings ?? []).map(f => f.category),
      feedbackSummary: assessment.coaching?.summary,
    },
    result: {
      score,
      // PRACTICE_PASS_SCORE (practiceThresholds.ts) is a 0-100 scale threshold
      // for drill mastery UI, not a belief-model success cut — reuse of that
      // constant here would couple two independent, differently-motivated
      // thresholds. Pronunciation evidence records score only; deriveNodeOutcome-
      // style success/failure inference is left to a future consumer once
      // pron:* has one (none exists yet — see the module doc comment).
    },
    reliability,
    context: {
      mode: args.mode,
      questionText: args.targetText.slice(0, 200),
      timed: false,
      engine: assessment.provider,
    },
  });

  // Per-finding events let a future pron:* consumer (none exists yet) distinguish
  // "this attempt's overall score" from "this specific liaison/nasal/R finding
  // recurred" without re-parsing observation.issueCategories. Each finding's
  // own confidence (already ceilinged per the capability matrix for inferred
  // categories, e.g. liaison at 0.6) caps this event's reliability so an
  // inferred finding never outweighs an authoritative one.
  for (const finding of assessment.phonologicalFindings ?? []) {
    events.push({
      id: `${args.attemptId}:${finding.category}:${finding.word}`,
      learnerId: LEARNER_ID,
      occurredAt,
      sourceSessionId: args.sessionId,
      sourceAttemptId: args.attemptId,
      evidenceType: 'language',
      targetNodeIds: [pronCategoryNodeId(finding.category)],
      observation: {
        issueCategories: [finding.category],
        feedbackSummary: finding.explanation,
      },
      result: {
        // A phonological finding is reported as an issue to fix, not a pass/fail
        // score — mirrors evidenceProjection.ts's issue observations (no result.score).
        issueCount: 1,
      },
      reliability: {
        ...reliability,
        assessmentConfidence: Math.min(reliability.assessmentConfidence, finding.confidence),
      },
      context: {
        mode: args.mode,
        questionText: args.targetText.slice(0, 200),
        timed: false,
        engine: assessment.provider,
      },
    });
  }

  return events;
}

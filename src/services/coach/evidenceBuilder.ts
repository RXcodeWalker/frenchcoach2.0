// ── Coach MVP: evidence builder ────────────────────────────────────────────────
// Converts a completed answer (transcript + FeedbackV2 + avoidance) into one or
// more reliability-tagged EvidenceEvents. Does not persist — the orchestrator owns
// persistence so the builder stays pure and testable.

import type { FeedbackV2, Question, AvoidanceSignal } from '../../types';
import type {
  EvidenceEvent,
  EvidenceReliability,
  EvidenceEvaluator,
} from '../../types/evidence';
import { LEARNER_ID } from './coachStorage';
import { resolveTargetNodes } from './skillGraph';

const RUBRIC_VERSION = 'coach-mvp-1';

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

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

export function buildEvidence(args: BuildEvidenceArgs): EvidenceEvent[] {
  const { feedback, avoidanceSignals, transcript } = args;
  const occurredAt = new Date().toISOString();
  const wordCount = feedback.wordCount ?? transcript.trim().split(/\s+/).filter(Boolean).length;

  const issues = feedback.issues ?? [];
  const grammarErrors = [
    ...(feedback.grammar?.critical ?? []),
    ...(feedback.grammar?.polish ?? []),
  ];

  const targetNodeIds = resolveTargetNodes({ issues, grammarErrors, avoidanceSignals });
  const reliability = computeReliability(feedback, wordCount);
  const criticalIssueCount = feedback.grammar?.critical?.length ?? 0;

  const events: EvidenceEvent[] = [];

  // Primary language evidence event.
  events.push({
    id: makeId('ev'),
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
      score: args.finalScore,
      success: args.finalScore >= 7,
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
      id: makeId('av'),
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

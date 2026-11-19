// Minimal EnvelopeView / report factories for the lost-marks tests. Casts are deliberate: the
// derivation reads only criteria marks, role-play responses, the QoL error list and the report's
// task errors, error categories and next-step descriptors.

import type { EnvelopeView } from '../../igcse/envelope/envelopeView';
import type { ExamFeedbackReport, ExamFeedbackNextStep } from '../../examFeedback/types';
import type { ErrorCategory } from '../../examFeedback/shared/errorCategories';

export interface ViewSpec {
  /** One entry per role-play task: its mark and what the candidate said. */
  rolePlay?: Array<{ mark: number; said?: string }>;
  communication?: number;
  qualityOfLanguage?: number;
  /** The QoL errors the envelope listed (quotes are throwaway). */
  qolErrors?: number;
  sessionId?: string;
}

export function makeView(spec: ViewSpec = {}): EnvelopeView {
  const rp = spec.rolePlay ?? [];
  const criteria = [
    ...rp.map((t, i) => ({ criterion: 'rolePlayTask', taskId: `rp${i + 1}`, mark: t.mark, confidence: 'high', justification: '', evidenceSpans: [] })),
    { criterion: 'communication', mark: spec.communication ?? 15, confidence: 'high', justification: '', evidenceSpans: [] },
    {
      criterion: 'qualityOfLanguage', mark: spec.qualityOfLanguage ?? 15, confidence: 'high', justification: '', evidenceSpans: [],
      errors: Array.from({ length: spec.qolErrors ?? 0 }, (_, i) => ({ source: 'topic1', turnId: `q${i}`, quote: 'q', correction: 'c' })),
    },
  ];
  return {
    attemptId: 'a1',
    sessionId: spec.sessionId ?? 'sess-1',
    scoredAt: '2026-11-10T10:00:00.000Z',
    total: 0,
    criteria,
    guardrailTriggers: [],
    evidenceGroups: rp.map((t, i) => ({ part: 'rolePlay', questionOrTaskId: `rp${i + 1}`, prompt: 'p', candidateResponse: t.said ?? 'je voudrais une chambre' })),
    typedTurnCount: 0,
  } as unknown as EnvelopeView;
}

const step = (targetDescriptor: string): ExamFeedbackNextStep => ({
  claim: 'x', quote: null, ref: null, targetDescriptor, targetSource: 'TN p.11',
});

export interface ReportSpec {
  /** Role-play task ids the report found an error in. */
  rpErrors?: string[];
  commTarget?: string;
  qolTarget?: string;
  qolCategories?: ErrorCategory[];
}

export function makeReport(spec: ReportSpec = {}): ExamFeedbackReport {
  return {
    feedbackVersion: 'exam-feedback-v0.2',
    rolePlay: {
      tasks: (spec.rpErrors ?? []).map((taskId) => ({ taskId, reason: null, quote: null, error: { quote: 'q', correction: 'c', category: 'other' as const } })),
      strengths: [],
      nextStep: null,
    },
    communication: { strengths: [], nextStep: spec.commTarget ? step(spec.commTarget) : null },
    qualityOfLanguage: {
      strengths: [],
      errors: (spec.qolCategories ?? []).map((category, i) => ({ quote: 'q', correction: 'c', category, errorIndex: i, source: 'topic1' as const, turnId: `q${i}` })),
      nextStep: spec.qolTarget ? step(spec.qolTarget) : null,
    },
  };
}

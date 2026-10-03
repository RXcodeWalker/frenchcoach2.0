// @vitest-environment jsdom
/**
 * Phase 3 Batch A: the post-marking exam report on ExamResults. Marks render
 * first and never wait on the report; pending, ready, failed (uncategorised
 * envelope errors + retry), daily-limit and empty states. The view is a
 * synthetic EnvelopeView — the report is display-only and reads nothing else.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { ExamResults } from '../ExamResults';
import { ScoringApiError } from '../../../services/exam/scoringApiClient';
import type { EnvelopeView } from '../../../domain/igcse/envelope/envelopeView';
import type { SessionTranscript } from '../../../domain/igcse/stt/types';
import type { ExamFeedbackReport } from '../../../domain/examFeedback/types';
import { RP_MARK_2, COMM_10_12 } from '../../../domain/igcse/canonical';

afterEach(() => cleanup());

const TRANSCRIPT = {
  sessionId: 'session-fb',
  utterances: [],
  stt: { provider: 'session-engine' },
} as unknown as SessionTranscript;

function view(qolErrors: EnvelopeView['criteria'][number]['errors'] = []): EnvelopeView {
  return {
    attemptId: 'attempt-fb',
    sessionId: 'session-fb',
    scoredAt: '2026-10-03T00:00:00.000Z',
    contentProvenance: 'original-practice',
    versions: {
      envelopeSchemaVersion: 'envelope-v0.4',
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'e',
      evidenceDetectorVersion: 'd',
      scoringPromptVersion: 'p',
      guardrailsVersion: 'g',
      calibrationVersion: 'none',
      gradeBoundarySeries: 'none',
    },
    llm: { provider: 'gemini', model: 'm', selfConsistencyRuns: 1 },
    transcriptConfidence: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0, userCorrected: false },
    total: 27,
    criteria: [
      { criterion: 'rolePlayTask', taskId: 'rp1', mark: 2, confidence: 'unassessed', justification: RP_MARK_2[0], evidenceSpans: [] },
      { criterion: 'rolePlayTask', taskId: 'rp2', mark: 1, confidence: 'unassessed', justification: 'Errors impede communication.', evidenceSpans: [] },
      { criterion: 'communication', mark: 9, band: { min: 7, max: 9, label: 'Satisfactory' }, confidence: 'unassessed', justification: 'j', evidenceSpans: [] },
      {
        criterion: 'qualityOfLanguage',
        mark: 8,
        band: { min: 7, max: 9, label: 'Satisfactory' },
        confidence: 'unassessed',
        justification: 'j',
        evidenceSpans: [],
        errors: qolErrors,
      },
    ],
    guardrailTriggers: [],
    evidenceGroups: [],
    typedTurnCount: 0,
  };
}

const ENVELOPE_ERRORS = [{ source: 'topic1' as const, turnId: 'q1', quote: 'je faire', correction: 'je fais' }];

const REPORT: ExamFeedbackReport = {
  feedbackVersion: 'exam-feedback-v0.1',
  rolePlay: {
    tasks: [
      { taskId: 'rp1', reason: 'You asked for the ticket clearly and politely.', quote: 'je voudrais un billet', error: null },
      {
        taskId: 'rp2',
        reason: 'The time came across, but the verb made the request unclear.',
        quote: 'je partir demain',
        error: { quote: 'je partir', correction: 'je pars', category: 'verb_form' },
      },
    ],
    strengths: [{ claim: 'Your requests were polite.', quote: 'je voudrais un billet', ref: 'rp1' }],
    nextStep: { claim: 'Check each verb is conjugated.', quote: null, ref: null, targetDescriptor: RP_MARK_2[1], targetSource: 'TN p.10' },
  },
  communication: {
    strengths: [{ claim: 'You gave a reason for your opinion.', quote: 'parce que c est amusant', ref: 'topic1:q2' }],
    nextStep: { claim: 'Add an example to each opinion.', quote: null, ref: null, targetDescriptor: COMM_10_12[3], targetSource: 'TN p.11' },
  },
  qualityOfLanguage: {
    strengths: [],
    errors: [{ errorIndex: 0, source: 'topic1', turnId: 'q1', quote: 'je faire', correction: 'je fais', category: 'verb_form' }],
    nextStep: null,
  },
};

function renderResults(requestFeedback: (id: string) => Promise<ExamFeedbackReport>, envelopeView: EnvelopeView = view(ENVELOPE_ERRORS)) {
  return render(
    <ExamResults
      transcript={TRANSCRIPT}
      envelopeView={envelopeView}
      scoringError={null}
      onRetryScoring={vi.fn()}
      onRetake={vi.fn()}
      onHome={vi.fn()}
      coached={false}
      railEntries={[]}
      requestFeedback={requestFeedback}
    />,
  );
}

describe('ExamResults — post-marking feedback (Phase 3 Batch A)', () => {
  it('pending: marks are visible while the report is still being written', () => {
    const request = vi.fn(() => new Promise<ExamFeedbackReport>(() => {}));
    renderResults(request);
    expect(request).toHaveBeenCalledWith('session-fb');
    expect(screen.getByText('27')).not.toBeNull();
    expect(screen.getByText('Writing your feedback…')).not.toBeNull();
  });

  it('ready: per-criterion sections, categorised mistakes, next step with its target, task-specific role-play reasons', async () => {
    renderResults(vi.fn(async () => REPORT));
    await screen.findByText('You asked for the ticket clearly and politely.');
    const section = screen.getByTestId('exam-feedback');
    expect(within(section).getAllByText('What you did well').length).toBeGreaterThan(0);
    expect(within(section).getByText('Mistakes')).not.toBeNull();
    expect(within(section).getAllByText('Verb form').length).toBeGreaterThan(0);
    expect(within(section).getAllByText('Next step').length).toBe(2);
    expect(within(section).getByText(`Target: ${COMM_10_12[3]} (TN p.11)`)).not.toBeNull();
    // Role-play reasons sit under each task's mark, and are not the copied Table A bullet.
    const reasons = screen.getAllByTestId('rp-reason').map((el) => el.textContent ?? '');
    expect(reasons).toHaveLength(2);
    expect(reasons.some((r) => r.includes(RP_MARK_2[0]))).toBe(false);
    expect(screen.getByText('je pars')).not.toBeNull();
    // No N/N inside the feedback section.
    expect(section.textContent).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  it('failed: shows the envelope errors uncategorised, and retry re-requests', async () => {
    const request = vi
      .fn<(id: string) => Promise<ExamFeedbackReport>>()
      .mockRejectedValueOnce(new ScoringApiError('feedback failed', 500, 'feedback_failed'))
      .mockResolvedValueOnce(REPORT);
    renderResults(request);
    await screen.findByText(/could not be written this time/);
    const section = screen.getByTestId('exam-feedback');
    expect(within(section).getByText('Uncategorised')).not.toBeNull();
    expect(within(section).getByText('je fais')).not.toBeNull();
    fireEvent.click(screen.getByText('Retry feedback'));
    await screen.findByText('You asked for the ticket clearly and politely.');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('daily limit reached: says so, keeps the envelope errors, offers no retry', async () => {
    renderResults(vi.fn(async () => Promise.reject(new ScoringApiError('daily_limit_reached', 429))));
    await screen.findByText(/reached today’s limit/);
    expect(screen.queryByText('Retry feedback')).toBeNull();
    expect(screen.getByText('je fais')).not.toBeNull();
  });

  it('empty: a report with nothing to fix shows no Mistakes section and invents none', async () => {
    const empty: ExamFeedbackReport = {
      ...REPORT,
      rolePlay: { tasks: [], strengths: [], nextStep: null },
      qualityOfLanguage: { strengths: [], errors: [], nextStep: null },
    };
    renderResults(vi.fn(async () => empty), view([]));
    await screen.findByText('You gave a reason for your opinion.');
    const section = screen.getByTestId('exam-feedback');
    expect(within(section).queryByText('Mistakes')).toBeNull();
    expect(screen.queryAllByTestId('rp-reason')).toHaveLength(0);
  });

  it('no envelope (scoring failed): no feedback request at all', async () => {
    const request = vi.fn(async () => REPORT);
    render(
      <ExamResults
        transcript={TRANSCRIPT}
        envelopeView={null}
        scoringError="The judge was unavailable."
        onRetryScoring={vi.fn()}
        onRetake={vi.fn()}
        onHome={vi.fn()}
        coached={false}
        railEntries={[]}
        requestFeedback={request}
      />,
    );
    await waitFor(() => expect(screen.getByText("The judge was unavailable.")).not.toBeNull());
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByTestId('exam-feedback')).toBeNull();
  });
});

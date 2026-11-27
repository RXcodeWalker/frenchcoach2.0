import { describe, expect, it } from 'vitest';
import type { EnvelopeView } from '../../../../domain/igcse/envelope/envelopeView';
import type { ExamFeedbackReport } from '../../../../domain/examFeedback/types';
import type { SessionTranscript } from '../../../../domain/igcse/stt/types';
import type { StoredSession } from '../../../../services/analytics/analyticsService';
import {
  answersByPart,
  areaMarks,
  areaTone,
  changeSince,
  examFacts,
  practicePlan,
  previousCountedExam,
  segmentAnswer,
  turnLabel,
} from '../examReport';

function view(overrides: Partial<EnvelopeView> = {}): EnvelopeView {
  return {
    attemptId: 'a',
    sessionId: 's-now',
    scoredAt: '2026-11-27T00:00:00.000Z',
    contentProvenance: 'original-practice',
    versions: {} as EnvelopeView['versions'],
    llm: { provider: 'gemini', model: 'm', selfConsistencyRuns: 1 },
    transcriptConfidence: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0, userCorrected: false },
    total: 26,
    criteria: [
      { criterion: 'rolePlayTask', taskId: 'rp1', mark: 2, confidence: 'x', justification: '', evidenceSpans: [] },
      { criterion: 'rolePlayTask', taskId: 'rp2', mark: 1, confidence: 'x', justification: '', evidenceSpans: [] },
      { criterion: 'rolePlayTask', taskId: 'rp3', mark: 2, confidence: 'x', justification: '', evidenceSpans: [] },
      { criterion: 'rolePlayTask', taskId: 'rp4', mark: 0, confidence: 'x', justification: '', evidenceSpans: [] },
      { criterion: 'rolePlayTask', taskId: 'rp5', mark: 2, confidence: 'x', justification: '', evidenceSpans: [] },
      { criterion: 'communication', mark: 11, confidence: 'x', justification: '', evidenceSpans: [] },
      {
        criterion: 'qualityOfLanguage',
        mark: 8,
        confidence: 'x',
        justification: '',
        evidenceSpans: [],
        errors: [
          { source: 'topic1', turnId: 'q1', quote: 'je faire', correction: 'je fais' },
          { source: 'topic1', turnId: 'q1', quote: 'le musique', correction: 'la musique' },
          { source: 'topic2', turnId: 'further1', quote: 'je vais allé', correction: 'je suis allé' },
        ],
      },
    ],
    guardrailTriggers: [],
    evidenceGroups: [
      { part: 'rolePlay', questionOrTaskId: 'rp1', prompt: 'Bonjour.', candidateResponse: 'Je voudrais un billet.' },
      { part: 'topic1', questionOrTaskId: 'topic1:q1', prompt: 'Que fais-tu ?', candidateResponse: 'Je faire du sport et le musique.', wordCount: 7 },
      { part: 'topic2', questionOrTaskId: 'topic2:further1', prompt: 'Et hier ?', candidateResponse: 'Hier je vais allé au parc.', wordCount: 6 },
    ],
    typedTurnCount: 0,
    ...overrides,
  };
}

const REPORT = {
  feedbackVersion: 'v',
  rolePlay: { tasks: [], strengths: [], nextStep: { claim: 'Answer every part of each task.', quote: null, ref: null, targetDescriptor: 'd', targetSource: 'TN p.10' } },
  communication: { strengths: [], nextStep: null },
  qualityOfLanguage: {
    strengths: [],
    errors: [
      { errorIndex: 0, source: 'topic1', turnId: 'q1', quote: 'je faire', correction: 'je fais', category: 'verb_form' },
      { errorIndex: 1, source: 'topic1', turnId: 'q1', quote: 'le musique', correction: 'la musique', category: 'gender' },
      { errorIndex: 2, source: 'topic2', turnId: 'further1', quote: 'je vais allé', correction: 'je suis allé', category: 'verb_form' },
    ],
    nextStep: null,
  },
} as ExamFeedbackReport;

describe('areaMarks', () => {
  it('copies the three areas from the envelope, role play summed over its tasks', () => {
    expect(areaMarks(view())).toEqual([
      { area: 'rolePlay', mark: 7, max: 10 },
      { area: 'communication', mark: 11, max: 15 },
      { area: 'qualityOfLanguage', mark: 8, max: 15 },
    ]);
  });

  it('uses the same 80 % / 60 % cut-offs as the Learn score colours', () => {
    expect(areaTone(12, 15)).toBe('progress');
    expect(areaTone(9, 15)).toBe('reward');
    expect(areaTone(8, 15)).toBe('correction');
  });
});

describe('practicePlan', () => {
  it('ranks areas by marks not awarded, with the tasks below full and the mistake count', () => {
    const plan = practicePlan(view(), REPORT);
    expect(plan.map((p) => [p.area, p.lost])).toEqual([
      ['qualityOfLanguage', 7],
      ['communication', 4],
      ['rolePlay', 3],
    ]);
    expect(plan[2].tasksBelowFull).toEqual(['rp2', 'rp4']);
    expect(plan[2].nextStep?.claim).toBe('Answer every part of each task.');
    expect(plan[0].mistakeCount).toBe(3);
    expect(plan[0].topCategory).toEqual({ label: 'Verb form', count: 2 });
    expect(plan[2].action.to).toBe('/exam/role-play');
  });

  it('leaves out an area with every mark awarded, and is empty at 40/40', () => {
    const full = view({
      total: 40,
      criteria: [
        { criterion: 'rolePlayTask', taskId: 'rp1', mark: 2, confidence: 'x', justification: '', evidenceSpans: [] },
        { criterion: 'communication', mark: 15, confidence: 'x', justification: '', evidenceSpans: [] },
        { criterion: 'qualityOfLanguage', mark: 15, confidence: 'x', justification: '', evidenceSpans: [] },
      ],
    });
    expect(practicePlan(full, null)).toEqual([]);
  });

  it('has no next step or category before the report arrives', () => {
    const plan = practicePlan(view(), null);
    expect(plan.every((p) => p.nextStep === null)).toBe(true);
    expect(plan[0].topCategory).toBeNull();
  });
});

describe('previousCountedExam / changeSince', () => {
  const marks = (total: number) => ({ rolePlay: 6, rolePlayMax: 10, communication: 9, qualityOfLanguage: total - 15, total });
  const session = (s: Partial<StoredSession>): StoredSession =>
    ({ id: 'x', date: '2026-11-01T00:00:00Z', mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 0, score: null, durationSec: 0, ...s }) as StoredSession;

  it('reads the newest counted Exam Sim that is not this attempt, never a Coached one', () => {
    const sessions = [
      session({ id: 'now', scoringSessionId: 's-now', date: '2026-11-27T00:00:00Z', examMarks: marks(26) }),
      session({ id: 'coached', practiceOnly: true, date: '2026-11-20T00:00:00Z', examMarks: marks(35) }),
      session({ id: 'old', scoringSessionId: 's-old', date: '2026-11-10T00:00:00Z', examMarks: marks(20) }),
      session({ id: 'older', scoringSessionId: 's-older', date: '2026-11-01T00:00:00Z', examMarks: marks(18) }),
      session({ id: 'learn', mode: 'practice', date: '2026-11-25T00:00:00Z' }),
    ];
    const prev = previousCountedExam(sessions, 's-now');
    expect(prev?.marks.total).toBe(20);
    expect(changeSince(view(), prev!)).toEqual({ total: 6, byArea: { rolePlay: 1, communication: 2, qualityOfLanguage: 3 } });
  });

  it('is null with no earlier counted attempt', () => {
    expect(previousCountedExam([session({ scoringSessionId: 's-now', examMarks: marks(26) })], 's-now')).toBeNull();
  });
});

describe('answersByPart', () => {
  it('groups answers by part and attaches each mistake by source + turn id, categorised from the report', () => {
    const parts = answersByPart(view(), REPORT);
    expect(parts.map((p) => p.title)).toEqual(['Role play', 'Topic conversation 1', 'Topic conversation 2']);
    expect(parts[0].rows[0]).toMatchObject({ label: 'Task 1', taskMark: 2, mistakes: [] });
    expect(parts[1].rows[0].mistakes.map((m) => [m.correction, m.category])).toEqual([
      ['je fais', 'verb_form'],
      ['la musique', 'gender'],
    ]);
    expect(parts[2].rows[0].label).toBe('Further question 1');
    expect(parts[2].rows[0].mistakes).toHaveLength(1);
  });

  it('labels turns in words', () => {
    expect(turnLabel('topic1:q3')).toBe('Question 3');
    expect(turnLabel('topic2:further2')).toBe('Further question 2');
    expect(turnLabel('rp4')).toBe('Task 4');
  });
});

describe('segmentAnswer', () => {
  it('cuts the answer into text and mistakes in reading order, case-insensitively', () => {
    const segs = segmentAnswer('Je faire du sport et le musique.', [
      { quote: 'le musique', correction: 'la musique' },
      { quote: 'je faire', correction: 'je fais' },
    ]);
    expect(segs.map((s) => [s.text, s.mistake?.correction ?? null])).toEqual([
      ['Je faire', 'je fais'],
      [' du sport et ', null],
      ['le musique', 'la musique'],
      ['.', null],
    ]);
  });

  it('leaves a quote it cannot find out of the markup, never moving it', () => {
    const segs = segmentAnswer('Bonjour.', [{ quote: 'absent', correction: 'x' }]);
    expect(segs).toEqual([{ text: 'Bonjour.' }]);
  });
});

describe('examFacts', () => {
  it('counts answers, speaking time and words from candidate turns only', () => {
    const transcript = {
      utterances: [
        { role: 'examiner', text: 'Bonjour', startS: 0, endS: 2 },
        { role: 'candidate', text: 'Je voudrais un billet', startS: 2, endS: 6 },
        { role: 'candidate', text: 'Oui merci', startS: 10, endS: 12 },
      ],
    } as unknown as SessionTranscript;
    expect(examFacts(transcript)).toEqual({ answers: 2, speakingS: 6, words: 6, longestAnswerWords: 4 });
  });
});

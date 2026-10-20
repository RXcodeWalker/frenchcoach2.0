// @vitest-environment jsdom
//
// learn-marking §8.1 key test: one ladder reply × the five marking levels gives
// identical evidence events, SM-2 review outcome, mid-session decision,
// Session.score and request body. Only what the learner sees and earns moves.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
import fixture from '../../../domain/learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import { getAIFeedback } from '../../../services/api/apiClient';
import { orchestrateAttempt } from '../../../services/coach/sessionOrchestrator';
import { midSessionAdjust } from '../../../domain/learn/selection/midSessionAdjust';
import { getTopicQuestions } from '../../../data/questions';
import { reducer } from '../../../context/AppContext';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import { LEARN_MARKING_SCHEME, MARKING_LEVELS, type MarkingLevel } from '../../../domain/learn/marking/markingLevel';
import { scoreLearnAttempt, shownBestScore } from '../markingLevel';
import type { ActiveSession, FeedbackV2, Question, Session, SessionQuestion } from '../../../types';

const QUESTION = {
  id: 'fam_01', text: 'Décris ta famille.', topicKey: 'family', hint: '', difficulty: 1,
  followUps: [], modelAnswer: '', keyVocab: [],
} as unknown as Question;
const TRANSCRIPT = fixture.request.transcript;

const fetchMock = vi.fn();

async function ladderFeedback(): Promise<FeedbackV2> {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => fixture.response });
  vi.stubGlobal('fetch', fetchMock);
  return getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech', LEARN_MARKING_SCHEME);
}

/** What Learn's _finalizeAnswer does with one answer at one marking level. */
function finalize(fb: FeedbackV2, level: MarkingLevel) {
  localStorage.removeItem(STORAGE_KEYS.reviewPool);
  localStorage.removeItem(STORAGE_KEYS.coachEvidence);
  const scored = scoreLearnAttempt(fb, level, 2);
  const session: Session = {
    id: 'sess-1', mode: 'practice', topicKey: 'family', questionText: QUESTION.text, transcript: TRANSCRIPT,
    wordCount: fb.wordCount, score: scored.examScore, xpEarned: scored.xp.gain, durationSec: 30,
    feedback: fb, createdAt: '2026-10-20T00:00:00.000Z',
  };
  const result = orchestrateAttempt({
    session, question: QUESTION, feedback: fb, avoidanceSignals: [], transcript: TRANSCRIPT, durationSec: 30,
    mode: 'practice', topicsUsed: ['family'], finalScore: fb.scores.overall, reward: scored.reward,
    streakDays: 2, totalSessionsBefore: 0,
  });
  return {
    scored,
    sessionScore: session.score,
    evidence: result.evidenceEvents.map((e) => ({ ...e, id: '', occurredAt: '' })),
    review: localStorage.getItem(STORAGE_KEYS.reviewPool),
    xp: result.xpResult.gain,
  };
}

/** Three answered questions at this attempt's scores, then the mid-session check before question 4. */
function midSessionDecision(examScore: number, markedScore: number | null) {
  const answered = (i: number): SessionQuestion => ({
    question: { ...QUESTION, id: `q${i}` }, status: 'completed', attempts: [], savedVocab: [],
    bestScore: examScore, bestMarkedScore: markedScore, slotType: 'target', slotBand: { lo: 3.5, hi: 4.5 },
  });
  const pending: SessionQuestion = {
    question: { ...QUESTION, id: 'q4' }, status: 'pending', attempts: [], savedVocab: [], bestScore: null,
    slotType: 'target', slotBand: { lo: 3.5, hi: 4.5 },
  };
  const session = {
    id: 'a', topicKey: 'family', mode: 'standard', targetCount: 5, currentIndex: 3, questionsCompleted: 3,
    questions: [answered(0), answered(1), answered(2), pending, { ...pending, question: { ...QUESTION, id: 'q5' } }],
  } as unknown as ActiveSession;
  const { direction } = midSessionAdjust({
    session, pool: getTopicQuestions('family'), seenIds: new Set(), focusSkillIds: [], activeDemandProblem: null,
    beliefSnapshot: null, alreadyAdjustedThisSession: false,
  });
  return direction;
}

describe('the marking level changes only what is seen and earned (learn-marking §8.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T09:00:00.000Z'));
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('identical request body whatever level is stored', async () => {
    const bodies: string[] = [];
    let state = { markingLevel: 'exam' } as unknown as Parameters<typeof reducer>[0];
    for (const level of MARKING_LEVELS) {
      state = reducer(state, { type: 'SET_MARKING_LEVEL', level });
      await ladderFeedback();
      const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
      bodies.push(init.body);
    }
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0]).marking).toBe('ladder-v1');
  });

  it('identical evidence events, review outcome and Session.score; XP differs', async () => {
    const fb = await ladderFeedback();
    const runs = MARKING_LEVELS.map((level) => finalize(fb, level));
    for (const run of runs.slice(1)) {
      expect(run.evidence).toEqual(runs[0].evidence);
      expect(run.review).toEqual(runs[0].review);
      expect(run.sessionScore).toBe(runs[0].sessionScore);
    }
    expect(runs[0].sessionScore).toBe(fb.scores.overall);
    expect(runs[0].review).toBeTruthy();
    // What the learner earns does move: A1 is below Exam (no score bonus), B2 is stricter.
    expect(runs.map((r) => r.scored.marked.score)).toEqual([8.8, 7.1, 6.8, 5.3, 4]);
    expect(new Set(runs.map((r) => r.xp)).size).toBeGreaterThan(1);
  });

  it('identical mid-session decision, even where the marked score alone would raise', async () => {
    const fb = await ladderFeedback();
    const decisions = MARKING_LEVELS.map((level) => {
      const { examScore, marked } = scoreLearnAttempt(fb, level, 0);
      return midSessionDecision(examScore as number, marked.score);
    });
    expect(new Set(decisions).size).toBe(1);
    // A1's marked 8.8 three times would be a raise if mid-session adjust read it.
    expect(midSessionDecision(8.8, 8.8)).toBe('raise');
    expect(decisions[0]).not.toBe('raise');
  });

  it('below Exam standard: no score bonus XP and no streak credit; the display reads the marked score', async () => {
    const fb = await ladderFeedback();
    const a1 = scoreLearnAttempt(fb, 'A1', 2);
    expect(a1.marked.score).toBe(8.8);
    expect(a1.reward).toEqual({ score: 8.8, scoreCounts: false });
    expect(a1.streak).toBe('hold');
    expect(a1.xp).toEqual({ gain: 10 + 4, gemsGain: 1 });
    expect(shownBestScore({ bestScore: a1.examScore, bestMarkedScore: a1.marked.score })).toBe(8.8);
    expect(shownBestScore({ bestScore: 6.8 })).toBe(6.8);
  });

  it('without levelCheck every level shows and earns the Exam score', async () => {
    const fb = { ...(await ladderFeedback()), levelCheck: undefined };
    for (const level of MARKING_LEVELS) {
      const s = scoreLearnAttempt(fb, level, 2);
      expect(s.marked).toMatchObject({ score: fb.scores.overall, level: 'exam', levelMarked: false });
      expect(s.reward).toEqual({ score: fb.scores.overall, scoreCounts: true });
    }
  });
});

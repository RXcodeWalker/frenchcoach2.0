// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { decideCoachBrief, type CoachInput, type CoachTopic } from '../../../services/coach/coachBrain';
import type { StoredSession } from '../../../services/analytics/analyticsService';
import { localDay } from '../../../lib/localDay';
import { LEARNER_MODEL_VERSION, type SyncedSkillModel } from '../../../domain/learnerModel/types';

const NOW = new Date(2026, 10, 4, 12, 0, 0).getTime();
const DAY = 86_400_000;
const ymdIn = (days: number) => localDay(new Date(2026, 10, 4 + days, 12));

const MODEL: SyncedSkillModel = {
  version: LEARNER_MODEL_VERSION,
  devices: {
    d1: {
      updatedAt: NOW,
      skills: {
        tense_past: { s: 2, f: 8, w: 10, a: 0, n: 12, t: NOW, last: NOW - DAY, r: '0001000100' },
        opinion: { s: 14, f: 1, w: 15, a: 0, n: 16, t: NOW, last: NOW - DAY, r: '111111111111' },
      },
    },
  },
  legacy: null,
};

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    state: { learnerModel: MODEL, learnerTrack: 'exam', junior: undefined, recentSessions: [], profile: { streak_days: 4 } },
    dispatch: vi.fn(),
  }),
}));
vi.mock('../../../components/TopContextBar', () => ({ TopContextBar: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock('../../../services/api/apiClient', () => ({ getLearnAllowance: async () => ({ remaining: 3 }) }));

const TOPICS: CoachTopic[] = [
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21 } },
];
const learn = (daysAgo: number): StoredSession => ({
  id: `p${daysAgo}`, date: new Date(NOW - daysAgo * DAY).toISOString(), mode: 'practice', topicKey: 'holidays',
  questionText: '', transcript: '', wordCount: 30, score: 6, durationSec: 60,
});
const exam = (daysAgo: number, total: number): StoredSession => ({
  id: `e${daysAgo}`, date: new Date(NOW - daysAgo * DAY).toISOString(), mode: 'exam', topicKey: null, questionText: '', transcript: '',
  wordCount: 300, score: total / 4, durationSec: 900,
  examMarks: { rolePlay: 6, rolePlayMax: 10, communication: Math.ceil((total - 6) / 2), qualityOfLanguage: Math.floor((total - 6) / 2), total },
});

let examDate: string | null = null;
function coachInput(): CoachInput {
  return {
    now: NOW, goalType: 'igcse', examDate, sessions: [learn(1), learn(2), learn(3), exam(9, 22), exam(16, 19)],
    skills: {}, weakestSkillIds: [], skillLabel: id => ({ tense_past: 'Past tense', opinion: 'Opinions' }[id] ?? id),
    activeProblemNodeId: null, focusSkillId: null, dueCounts: {}, topics: TOPICS, topicStats: {}, learnAnswersLeft: 3,
  };
}
vi.mock('../../../services/coach/coachBriefInput', () => ({
  getCoachBriefWithInput: () => {
    const input = coachInput();
    return { input, brief: decideCoachBrief(input) };
  },
}));

import { MyPlan } from '../../MyPlan';

function renderPlan() {
  return render(<MemoryRouter><MyPlan /></MemoryRouter>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('My Plan', () => {
  it('lays out the countdown, today, the week, the road and where the learner stands', () => {
    examDate = ymdIn(40);
    renderPlan();
    expect(within(screen.getByTestId('plan-countdown')).getByText(/You are in: Sharpen/)).toBeTruthy();
    expect(screen.getByTestId('progress-next-step-cta')).toBeTruthy();
    expect(screen.getByTestId('plan-week').querySelectorAll('li')).toHaveLength(7);
    expect(screen.getByTestId('plan-stage-sharpen').getAttribute('aria-current')).toBe('step');
    expect(screen.getByTestId('plan-stage-exam_day')).toBeTruthy();
    expect(screen.getByTestId('plan-skill-tense_past').textContent).toMatch(/Practise/);
    expect(screen.getByTestId('plan-skill-opinion')).toBeTruthy();
    // Two counted Exam Sims: the marks are shown, a trend is not.
    expect(screen.getByTestId('plan-exam-no-trend').textContent).toMatch(/4 more counted Exam Sims/);
    expect(screen.queryByTestId('plan-exam-trend')).toBeNull();
    expect(screen.getByTestId('plan-calendar-summary').textContent).toMatch(/5\s*days practised/); // three Learn days and two exam days
  });

  it('has exactly one primary button: today’s move', () => {
    examDate = ymdIn(40);
    renderPlan();
    const primaries = screen.getAllByRole('button').filter(b => /\bbg-action\b/.test(b.className));
    expect(primaries).toEqual([screen.getByTestId('progress-next-step-cta')]);
  });

  it('asks for an exam date rather than guessing one, and draws no road', () => {
    examDate = null;
    renderPlan();
    expect(screen.getByTestId('plan-set-exam-date').textContent).toBe('Add exam date');
    expect(screen.queryByTestId('plan-road')).toBeNull();
  });

  it('never predicts a grade, mark or readiness anywhere on the page', () => {
    for (const d of [null, ymdIn(3), ymdIn(40), ymdIn(150)]) {
      examDate = d;
      const { container, unmount } = renderPlan();
      // The footnote says, on purpose, that the plan does NOT predict a grade; everything else may not mention one.
      container.querySelector('[data-testid="plan-how"]')?.remove();
      const text = container.textContent ?? '';
      expect(text, String(d)).not.toMatch(/predict|you(?:'|’)ll get|you will get|on track for|readiness|\bgrade\b/i);
      unmount();
    }
  });
});

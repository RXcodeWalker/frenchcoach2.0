// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NEWS_EDITIONS } from '../../data/news';
import { editionForDay } from '../../data/news/rotation';
import { localDay } from '../../lib/localDay';

const addXP = vi.hoisted(() => vi.fn());
const awardXP = vi.hoisted(() => vi.fn(() => ({ gain: 25, totalXP: 125, gemsGain: 2, totalGems: 12, levelUp: false, activeBoosters: [] })));
const dispatch = vi.hoisted(() => vi.fn());
const getAIFeedback = vi.hoisted(() => vi.fn());
const broadcastState = vi.hoisted(() => ({ listened: false }));
const playSentence = vi.hoisted(() => vi.fn());
const transcript = vi.hoisted(() => ({ value: '' }));

vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ subtitle }: { subtitle?: string }) => <header data-testid="subtitle">{subtitle}</header>,
}));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ state: { profile: { streak_days: 0, sessions_count: 0 }, markingLevel: 'exam' }, dispatch }),
  dispatchAddXP: addXP,
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
vi.mock('../../features/recording/useRecording', () => ({
  useRecording: () => ({
    isRecording: false, elapsedTime: 30, waveData: [], transcript: transcript.value, audioBlob: null,
    lastActivityAt: null, micLevel: { subscribe: () => () => {}, read: () => 0 }, start: vi.fn(),
    stop: vi.fn(async () => transcript.value), audioBlobPromise: vi.fn(async () => null), sttSupported: true, sttError: null,
  }),
}));
vi.mock('../learn/RecordingPanel', () => ({
  RecordingPanel: ({ onStop }: { onStop: () => void }) => <button type="button" onClick={onStop}>stop recording</button>,
}));
vi.mock('../learn/FeedbackPanel', () => ({ FeedbackPanel: () => <p>language feedback</p> }));
vi.mock('../../services/api/apiClient', () => ({ getAIFeedback }));
vi.mock('../../features/news/useBroadcast', () => ({
  useBroadcast: () => ({
    playing: false, current: null, listened: broadcastState.listened, unavailable: false, speed: 'normal',
    setSpeed: vi.fn(), playAll: vi.fn(), playSentence, stop: vi.fn(),
  }),
}));
vi.mock('../../services/progression/progressionService', () => ({
  awardXP,
  checkAchievements: () => [],
  getProgressionState: () => ({ level: { name: 'Débutant' } }),
}));
vi.mock('../../services/coach/sessionOrchestrator', () => ({ observeAttempt: vi.fn() }));
vi.mock('../../services/coaching/diagnosticEngine', () => ({ getSkillProfile: () => ({}) }));
vi.mock('../../services/coach/achievementContextBuilder', () => ({ buildAchievementContext: () => ({}) }));

import { DailyNewsFlash } from '../DailyNewsFlash';

const today = localDay();
const edition = editionForDay(today, NEWS_EDITIONS);
const b1 = edition.levels.b1;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  broadcastState.listened = false;
  transcript.value = b1.modelRetell;
  getAIFeedback.mockResolvedValue({
    scores: { overall: 7, communication: 7, language: 7, fluency: 7 },
    grammar: { critical: [], polish: [] }, vocabulary: [], style: [], fillers: [], wordCount: 40,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

function renderScreen(path = '/daily-news') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/daily-news" element={<DailyNewsFlash />} />
        <Route path="/explore" element={<p>Explore</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function answerChecksCorrectly() {
  b1.check.forEach((c, i) => {
    const q = screen.getByTestId(`news-check-${i}`);
    fireEvent.click(q.querySelectorAll('button')[c.answer]);
  });
  fireEvent.click(screen.getByTestId('news-check-done'));
}

async function runToReview() {
  fireEvent.click(screen.getByTestId('news-start'));
  answerChecksCorrectly();
  fireEvent.click(await screen.findByText('stop recording'));
  fireEvent.click(await screen.findByTestId('news-skip-opinion'));
  await screen.findByText(/facts reported/);
}

describe('DailyNewsFlash', () => {
  it("shows today's edition at the learner's level, on the Listen step, with the transcript locked", () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: b1.headline })).toBeTruthy();
    expect(screen.getByLabelText('Progress').querySelector('[aria-current="step"]')?.textContent).toContain('Listen');
    expect(screen.queryByTestId('news-transcript')).toBeNull();
    expect((screen.getByTestId('news-reveal') as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens the transcript for free after one full listen (no XP is taken)', () => {
    broadcastState.listened = true;
    renderScreen();
    fireEvent.click(screen.getByTestId('news-reveal'));
    expect(screen.getByTestId('news-transcript').textContent).toContain(b1.sentences[0].fr);
    expect(addXP).not.toHaveBeenCalled();
  });

  it('a wrong check answer offers the sentence that holds the answer', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('news-start'));
    const c = b1.check[0];
    const wrong = c.answer === 0 ? 1 : 0;
    fireEvent.click(screen.getByTestId('news-check-0').querySelectorAll('button')[wrong]);
    fireEvent.click(screen.getByRole('button', { name: /hear it again/i }));
    expect(playSentence).toHaveBeenCalledWith(c.sentence);
  });

  it('lights the facts already said while reporting', async () => {
    transcript.value = b1.modelRetell;
    renderScreen();
    fireEvent.click(screen.getByTestId('news-start'));
    answerChecksCorrectly();
    await screen.findByText('stop recording');
    for (const f of b1.facts) expect(screen.getByTestId(`news-fact-${f.id}`).textContent).toContain('(covered)');
  });

  it('awards XP once per edition-day: the first report earns it, a retry is a practice run', async () => {
    renderScreen();
    await runToReview();
    expect(screen.getByRole('heading', { name: /facts reported/ }).textContent).toBe(`${b1.facts.length} of ${b1.facts.length} facts reported`);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith(10, 0, 'daily_news');
    expect(screen.getByTestId('news-xp').textContent).toContain('+25');
    expect(screen.getByTestId('news-ear-only')).toBeTruthy();

    fireEvent.click(screen.getByTestId('news-retry'));
    await runToReview();
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('news-practice-run')).toBeTruthy();
    expect(dispatch.mock.calls.filter(([a]) => a.type === 'ADD_SESSION')).toHaveLength(1);
  });

  it('says honestly when language feedback is unavailable, and still shows the facts', async () => {
    getAIFeedback.mockRejectedValue(new Error('offline'));
    renderScreen();
    await runToReview();
    expect(screen.getByText(/feedback on your french isn’t available/i)).toBeTruthy();
    expect(screen.queryByText('language feedback')).toBeNull();
  });

  it('opens an archive day from the link, and ignores a day outside the archive', () => {
    const [, yesterday] = (function () {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return [today, localDay(d)];
    })();
    renderScreen(`/daily-news?day=${yesterday}`);
    expect(screen.getByText(/From the archive/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: editionForDay(yesterday, NEWS_EDITIONS).levels.b1.headline })).toBeTruthy();
    cleanup();
    renderScreen('/daily-news?day=2001-01-01');
    expect(screen.getByText(/Today’s edition/)).toBeTruthy();
  });
});

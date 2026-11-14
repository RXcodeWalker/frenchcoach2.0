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
const track = vi.hoisted(() => vi.fn());

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
vi.mock('../../services/telemetry/telemetryService', () => ({ track }));
vi.mock('../../services/tts/ttsService', () => ({ TTS: { speak: vi.fn(async () => {}), stop: vi.fn() } }));

import { DailyNewsFlash } from '../DailyNewsFlash';
import { SEGMENT_INFO, featuredSegment, practiceSegments } from '../../features/news/show/showPlan';

const today = localDay();
const edition = editionForDay(today, NEWS_EDITIONS);
const b1 = edition.levels.b1;
const featured = featuredSegment(today);
const answer = `${b1.glossary[0].fr} : je pense que c'est une très bonne idée.`;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  broadcastState.listened = true;
  transcript.value = answer;
  getAIFeedback.mockResolvedValue({
    scores: { overall: 7, communication: 7, language: 7, fluency: 7 },
    cefrLevel: 'B1',
    grammar: { critical: [], polish: [] }, vocabulary: [], style: [], fillers: [], wordCount: 40,
    encouragement: 'Tu donnes ton avis clairement.',
    strengths: [{ quote: 'je pense que', why: 'You gave an opinion.' }],
    improved_answer: `${answer} En plus, c'est utile.`,
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

const wrongPick = (b1.fake.answer + 1) % b1.fake.options.length;

function playIntox(pickRight = true) {
  fireEvent.click(screen.getByTestId('news-start'));
  fireEvent.click(screen.getByTestId(`news-intox-option-${pickRight ? b1.fake.answer : wrongPick}`));
  fireEvent.click(screen.getByTestId('news-intox-done'));
}

async function answerTurns(count: number) {
  for (let i = 0; i < count; i++) {
    fireEvent.click(await screen.findByText('stop recording'));
    fireEvent.click(await screen.findByTestId('news-turn-next'));
  }
  await screen.findByRole('heading', { name: 'That’s a wrap!' });
}

async function runShow() {
  playIntox();
  await answerTurns(SEGMENT_INFO[featured].turns);
}

describe('DailyNewsFlash — the news show', () => {
  it("shows today's edition and today's segment on the Listen step, with the transcript locked until one listen", () => {
    broadcastState.listened = false;
    renderScreen();
    expect(screen.getByRole('heading', { name: b1.headline })).toBeTruthy();
    expect(screen.getByLabelText('Progress').querySelector('[aria-current="step"]')?.textContent).toContain('Listen');
    expect(screen.getByRole('heading', { name: SEGMENT_INFO[featured].title })).toBeTruthy();
    expect((screen.getByTestId('news-reveal') as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens the transcript after one full listen, with no XP taken', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('news-reveal'));
    expect(screen.getByTestId('news-transcript').textContent).toContain(b1.sentences[0].fr);
    expect(addXP).not.toHaveBeenCalled();
  });

  it('Intox ou info: a wrong pick shows the fake line and the real one', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('news-start'));
    fireEvent.click(screen.getByTestId(`news-intox-option-${wrongPick}`));
    const result = screen.getByTestId('news-intox-result');
    expect(result.textContent).toContain('Not quite');
    expect(result.textContent).toContain(b1.fake.fr);
    expect(result.textContent).toContain(b1.sentences[b1.fake.sentence].fr);
  });

  it('the featured segment earns XP once per edition-day; a replay is practice', async () => {
    renderScreen();
    await runShow();
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith(10, 0, 'daily_news');
    expect(screen.getByTestId('news-xp').textContent).toContain('+25');
    expect(track).toHaveBeenCalledWith({
      name: 'news_segment_completed',
      props: { segment: featured, level: 'b1', featured: true, answered: SEGMENT_INFO[featured].turns },
    });

    fireEvent.click(screen.getByTestId('news-retry'));
    await runShow();
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('news-practice-run')).toBeTruthy();
    expect(dispatch.mock.calls.filter(([a]) => a.type === 'ADD_SESSION')).toHaveLength(1);
  });

  it('a practice segment gets feedback but no XP and no session', async () => {
    renderScreen();
    await runShow();
    const other = practiceSegments(featured)[0];
    fireEvent.click(screen.getByTestId(`news-practice-${other}`));
    await answerTurns(SEGMENT_INFO[other].turns);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls.filter(([a]) => a.type === 'ADD_SESSION')).toHaveLength(1);
    expect(screen.getByTestId('news-practice-run')).toBeTruthy();
    expect(screen.getByTestId('news-coach-feedback')).toBeTruthy();
  });

  it('feedback shows what worked and a better version, never a mark, score or level', async () => {
    renderScreen();
    await runShow();
    const fb = screen.getByTestId('news-coach-feedback').textContent ?? '';
    expect(fb).toContain('Tu donnes ton avis clairement.');
    expect(fb).toContain('je pense que');
    expect(fb).not.toMatch(/\d/);
    expect(fb).not.toMatch(/B1|A2|B2|CEFR|\/10/);
  });

  it('shows the story words the learner reused, and their answers beside the model', async () => {
    renderScreen();
    await runShow();
    const words = screen.getByTestId('news-words-used');
    expect(words.textContent).toContain(b1.glossary[0].fr);
    expect(words.textContent).toContain('(used)');
    expect(screen.getByTestId('news-your-answers').textContent).toContain(answer);
  });

  it('says honestly when feedback is unavailable, and still shows the answers', async () => {
    getAIFeedback.mockRejectedValue(new Error('offline'));
    renderScreen();
    await runShow();
    expect(screen.getByTestId('news-feedback-unavailable')).toBeTruthy();
    expect(screen.getByTestId('news-your-answers')).toBeTruthy();
  });

  it('opens an archive day from the link, and ignores a day outside the archive', () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = localDay(d);
    renderScreen(`/daily-news?day=${yesterday}`);
    expect(screen.getByText(/From the archive/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: editionForDay(yesterday, NEWS_EDITIONS).levels.b1.headline })).toBeTruthy();
    cleanup();
    renderScreen('/daily-news?day=2001-01-01');
    expect(screen.getByText(/Today’s edition/)).toBeTruthy();
  });
});

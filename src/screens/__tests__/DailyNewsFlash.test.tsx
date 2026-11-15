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
const detective = vi.hoisted(() => ({ status: 'coming-soon' as 'live' | 'coming-soon' }));
const forced = vi.hoisted(() => ({ id: null as string | null }));

vi.mock('../../data/news/rotation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/news/rotation')>();
  return {
    ...actual,
    editionForDay: (...args: Parameters<typeof actual.editionForDay>) =>
      (forced.id && args[1].find(e => e.id === forced.id)) || actual.editionForDay(...args),
  };
});
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
vi.mock('../../services/coaching/diagnosticEngine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/coaching/diagnosticEngine')>()),
  getSkillProfile: () => ({}),
}));
vi.mock('../../services/coach/achievementContextBuilder', () => ({ buildAchievementContext: () => ({}) }));
vi.mock('../../services/telemetry/telemetryService', () => ({ track }));
vi.mock('../../services/tts/ttsService', () => ({ TTS: { speak: vi.fn(async () => {}), stop: vi.fn() } }));
vi.mock('../../config/featureFlags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/featureFlags')>();
  return {
    ...actual,
    resolveFeatureStatus: (key: Parameters<typeof actual.resolveFeatureStatus>[0]) =>
      key === 'questionDetective' ? detective.status : actual.resolveFeatureStatus(key),
  };
});

import { DailyNewsFlash } from '../DailyNewsFlash';
import { SEGMENT_INFO, SEGMENT_ORDER, featuredSegment, type SegmentId } from '../../features/news/show/showPlan';
import { segmentTurns } from '../../features/news/show/segmentPrompts';
import { questionWord } from '../../data/questionWords/words';

const today = localDay();
const edition = editionForDay(today, NEWS_EDITIONS);
const b1 = edition.levels.b1;
const featured = featuredSegment(today);
const answer = `${b1.glossary[0].fr} : je pense que c'est une très bonne idée.`;
const turnCount = (segment: SegmentId) => segmentTurns(b1, segment).length;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  broadcastState.listened = true;
  transcript.value = answer;
  detective.status = 'coming-soon';
  forced.id = null;
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
  await answerTurns(turnCount(featured));
}

/** Finish today's show, then open a segment again: practice when it isn't today's, a replay when it is. */
async function openSegment(segment: SegmentId) {
  await runShow();
  if (segment === featured) {
    fireEvent.click(screen.getByTestId('news-retry'));
    playIntox();
  } else {
    fireEvent.click(screen.getByTestId(`news-practice-${segment}`));
  }
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
      props: { segment: featured, level: 'b1', featured: true, answered: turnCount(featured) },
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
    const other = SEGMENT_ORDER.find(s => s !== featured)!;
    fireEvent.click(screen.getByTestId(`news-practice-${other}`));
    await answerTurns(turnCount(other));
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls.filter(([a]) => a.type === 'ADD_SESSION')).toHaveLength(1);
    expect(screen.getByTestId('news-practice-run')).toBeTruthy();
    expect(screen.getByTestId('news-coach-feedback')).toBeTruthy();
  });

  it("Le journaliste: the wrong question word gets a nudge naming both words; the right one gets Henri's answer", async () => {
    detective.status = 'live';
    renderScreen();
    await openSegment('journalist');
    const [t0, t1, t2] = b1.journalist.targets;

    expect(screen.getByTestId('news-turn-prompt').textContent).toBe(t0.goal);
    transcript.value = t1.question; // asks with another goal's word
    fireEvent.click(await screen.findByText('stop recording'));
    const nudge = await screen.findByTestId('news-turn-nudge');
    expect(nudge.textContent).toContain(questionWord(t1.word)!.lemma);
    expect(nudge.textContent).toContain(questionWord(t0.word)!.lemma);
    expect(screen.queryByTestId('news-turn-reply')).toBeNull();

    fireEvent.click(screen.getByTestId('news-turn-again'));
    transcript.value = t0.question;
    fireEvent.click(await screen.findByText('stop recording'));
    expect((await screen.findByTestId('news-turn-reply')).textContent).toContain(t0.answer.fr);
    fireEvent.click(screen.getByTestId('news-turn-next'));

    for (const t of [t1, t2]) {
      transcript.value = t.question;
      fireEvent.click(await screen.findByText('stop recording'));
      expect((await screen.findByTestId('news-turn-reply')).textContent).toContain(t.answer.fr);
      fireEvent.click(screen.getByTestId('news-turn-next'));
    }
    await screen.findByRole('heading', { name: 'That’s a wrap!' });
    const link = screen.getByTestId('news-detective-link').querySelector('a')!;
    expect(link.getAttribute('href')).toBe(`/question-detective?words=${t0.word},${t1.word}`);
    expect(screen.getByTestId('news-your-answers').textContent).toContain(t0.goal);
  });

  it('Le journaliste: no Question Detective link while that game is not live', async () => {
    renderScreen();
    await openSegment('journalist');
    transcript.value = b1.journalist.targets[1].question;
    fireEvent.click(await screen.findByText('stop recording'));
    fireEvent.click(await screen.findByTestId('news-turn-next')); // "Move on"
    transcript.value = answer;
    await answerTurns(2);
    expect(screen.queryByTestId('news-detective-link')).toBeNull();
  });

  it("Et après ?: two prompts, then Henri's guess, labelled as a guess", async () => {
    renderScreen();
    await openSegment('predict');
    expect(screen.getByTestId('news-turn-prompt').textContent).toBe(b1.predict.next.fr);
    await answerTurns(2);
    const guess = screen.getByTestId('news-henri-guess');
    expect(guess.textContent).toContain(b1.predict.henri.fr);
    expect(guess.textContent).toContain('guess');
  });

  it("L'interview with a fact sheet: the sheet is shown, Henri reacts, and each fix sits under its own answer", async () => {
    forced.id = 'bees-on-roofs';
    const lvl = NEWS_EDITIONS.find(e => e.id === 'bees-on-roofs')!.levels.b1;
    const qs = lvl.interview.questions;
    const first = "Je viens le lundi matin et j'ouvre les ruches avec ma combinaison.";
    getAIFeedback.mockResolvedValue({
      scores: { overall: 7 }, cefrLevel: 'B1', vocabulary: [], style: [], fillers: [], wordCount: 40,
      grammar: { critical: [{ quote: 'je viens le lundi', correction: 'je viens chaque lundi', severity: 'major' }], polish: [] },
      encouragement: 'Tu réponds bien dans ton rôle.',
      strengths: [{ quote: "j'ouvre les ruches", why: 'Clear description.' }],
      improved_answer: 'whole thing',
    });
    renderScreen();
    fireEvent.click(screen.getByTestId('news-start'));
    fireEvent.click(screen.getByTestId(`news-intox-option-${lvl.fake.answer}`));
    fireEvent.click(screen.getByTestId('news-intox-done'));
    if (featured !== 'interview') {
      await answerTurns(segmentTurns(lvl, featured).length);
      fireEvent.click(screen.getByTestId('news-practice-interview'));
    }

    expect(screen.getByTestId('news-fact-sheet').textContent).toContain(lvl.interview.factSheet![0].note);
    transcript.value = first;
    fireEvent.click(await screen.findByText('stop recording'));
    expect((await screen.findByTestId('news-turn-reaction')).textContent).toContain(qs[0].reaction!.fr);
    fireEvent.click(screen.getByTestId('news-turn-next'));
    transcript.value = answer;
    await answerTurns(qs.length - 1);

    const a0 = screen.getByTestId('news-answer-0');
    expect(a0.textContent).toContain('je viens chaque lundi');
    expect(screen.getByTestId('news-say-better').textContent).toContain('chaque lundi matin');
    expect(a0.querySelector('[data-testid="news-check-fact"]')!.getAttribute('data-met')).toBe('true');
    expect(screen.getByTestId('news-answer-1').querySelector('[data-testid="news-answer-fixes"]')).toBeNull();
    const overall = screen.getByTestId('news-coach-feedback').textContent ?? '';
    expect(overall).toContain('under each answer');
    expect(overall).not.toContain('je viens chaque lundi');
    expect(overall).not.toMatch(/\d|B1|\/10/);
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

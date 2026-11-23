// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { STORY_CARDS, isGuidedCard } from '../../../data/storyCards';
import { drillSessionId } from '../../../features/rolePlayDrill/drillProgress';

const history = vi.hoisted(() => ({ ids: [] as string[] }));
const voice = vi.hoisted(() => ({ french: true }));
/** What the next recordings "heard", in order; an empty queue hears nothing. */
const mic = vi.hoisted(() => ({ heard: [] as string[] }));
const drillRecorder = vi.hoisted(() => ({ record: vi.fn() }));
const dispatch = vi.hoisted(() => ({ fn: vi.fn() }));
const examiner = vi.hoisted(() => ({ speak: vi.fn() }));

vi.mock('../../../components/TopContextBar', () => ({
  TopContextBar: ({ title, subtitle, onBack, backLabel }: { title: string; subtitle?: string; onBack?: () => void; backLabel?: string }) => (
    <header data-testid="bar">
      {title} · {subtitle}
      {onBack && <button type="button" aria-label={backLabel ?? 'Back'} onClick={onBack} />}
    </header>
  ),
}));
vi.mock('../../../components/layout/shellChrome', () => ({ useShowNavRail: () => {} }));
vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ state: { profile: { streak_days: 2, sessions_count: 4 } }, dispatch: dispatch.fn }),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
vi.mock('../../../features/recording/useRecording', async () => {
  const React = await import('react');
  return {
    useRecording: () => {
      const [isRecording, setIsRecording] = React.useState(false);
      return {
        isRecording, elapsedTime: 4, waveData: [], transcript: '', audioBlob: null,
        lastActivityAt: null, micLevel: { subscribe: () => () => {}, read: () => 0 },
        start: () => setIsRecording(true),
        stop: async () => { setIsRecording(false); return mic.heard.shift() ?? ''; },
        audioBlobPromise: vi.fn(), sttSupported: true, sttError: null,
      };
    },
  };
});
vi.mock('../../../services/coach/drillAnswerRecorder', () => ({
  recordDrillAnswer: (input: unknown) => {
    drillRecorder.record(input);
    return {
      session: { id: 'story-x' },
      xpResult: { gain: 10, totalXP: 10, gemsGain: 1, totalGems: 1, activeBoosters: [] },
      newUnlockedAchievementIds: [],
      newLevelName: 'Débutant',
    };
  },
}));
vi.mock('../../../services/analytics/analyticsService', () => ({
  getSessionHistory: () => history.ids.map((id) => ({ id })),
}));
vi.mock('../../../services/exam/examinerVoice', () => ({
  primeExaminerVoice: vi.fn(),
  speakExaminerText: (...args: unknown[]) => examiner.speak(...args),
  stopExaminerVoice: vi.fn(),
  getExaminerVoiceGeneration: () => 0,
  isExaminerVoiceMuted: () => false,
  hasFrenchVoice: () => voice.french,
}));

import { RolePlayDrill } from '../RolePlayDrill';

const guidedCard = STORY_CARDS.find(isGuidedCard)!;
const examCard = STORY_CARDS.find((c) => !isGuidedCard(c))!;

beforeEach(() => {
  history.ids = [];
  voice.french = true;
  mic.heard = [];
  drillRecorder.record.mockClear();
  dispatch.fn.mockClear();
  examiner.speak.mockReset();
  examiner.speak.mockResolvedValue(undefined);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

function renderDrill() {
  render(
    <MemoryRouter initialEntries={['/exam/role-play']}>
      <Routes>
        <Route path="/exam/role-play" element={<RolePlayDrill />} />
        <Route path="/exam" element={<p>Exam</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RolePlayDrill', () => {
  it('lists every card in the two groups and reads progress back from the session history', () => {
    history.ids = guidedCard.tasks.map((_, i) => drillSessionId(guidedCard.id, i, i));
    renderDrill();
    expect(screen.getByRole('heading', { name: 'Exam practice' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Extra practice' })).toBeTruthy();
    expect(screen.getAllByTestId(/^drill-card-/)).toHaveLength(STORY_CARDS.length);
    expect(within(screen.getByTestId(`drill-card-${guidedCard.id}`)).getByText('Done')).toBeTruthy();
    expect(screen.getByText(/cards done/).textContent).toContain(`1 of ${STORY_CARDS.length}`);
  });

  it('shows the card with its English tasks, then starts the role play with the first examiner line', async () => {
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${guidedCard.id}`));
    expect(screen.getByRole('heading', { name: 'Your tasks' })).toBeTruthy();
    expect(screen.getByText(guidedCard.tasks[0].promptEn)).toBeTruthy();

    fireEvent.click(screen.getByTestId('drill-start'));
    expect(await screen.findByText(guidedCard.tasks[0].promptFr)).toBeTruthy();
    expect(screen.getByTestId('bar').textContent).toContain(`Exchange 1 of ${guidedCard.tasks.length}`);
    expect(screen.getByText('Your task')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record your answer' })).toBeTruthy();
  });

  it('listen-only hides the examiner line until "Show words"', async () => {
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${guidedCard.id}`));
    fireEvent.click(screen.getByRole('switch', { name: /Listen only/ }));
    fireEvent.click(screen.getByTestId('drill-start'));
    expect(await screen.findByText('Listen, then answer.')).toBeTruthy();
    expect(screen.queryByText(guidedCard.tasks[0].promptFr)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Show words/ }));
    expect(screen.getByText(guidedCard.tasks[0].promptFr)).toBeTruthy();
  });

  it('an exam-style card lists no tasks, and shows the English task only when asked', async () => {
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${examCard.id}`));
    expect(screen.queryByRole('heading', { name: 'Your tasks' })).toBeNull();
    expect(screen.queryByText(examCard.tasks[0].promptEn)).toBeNull();

    fireEvent.click(screen.getByTestId('drill-start'));
    expect(await screen.findByText(examCard.tasks[0].promptFr)).toBeTruthy();
    expect(screen.queryByText('Your task')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Show the task in English/ }));
    expect(screen.getByText(examCard.tasks[0].promptEn)).toBeTruthy();
  });

  it('cannot hide the examiner line on a device with no French voice', () => {
    voice.french = false;
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${guidedCard.id}`));
    expect((screen.getByRole('switch', { name: /Listen only/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

/** Opens the exam-style card and starts it; resolves once the first question is on screen. */
async function startExamCard(options: { examConditions?: boolean } = {}) {
  renderDrill();
  fireEvent.click(screen.getByTestId(`drill-card-${examCard.id}`));
  if (options.examConditions) fireEvent.click(screen.getByRole('switch', { name: /Exam conditions/ }));
  fireEvent.click(screen.getByTestId('drill-start'));
  await screen.findByText(examCard.tasks[0].promptFr);
}

/** Records one answer: the mic "hears" `said`, then Stop is tapped. */
async function answer(said: string, nextText: string | RegExp) {
  mic.heard.push(said);
  fireEvent.click(await screen.findByRole('button', { name: 'Record your answer' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Stop recording' })); });
  await screen.findByText(nextText);
}

describe('RolePlayDrill — the offline coaching', () => {
  it('a silent answer is not recorded: the examiner asks again and the mic is offered again', async () => {
    await startExamCard();
    await answer('', `Pardon ? ${examCard.tasks[0].promptFr}`);
    expect(screen.queryByTestId('drill-answer-card-0')).toBeNull();
    expect(screen.queryByText(/nothing heard/i)).toBeNull();
    expect(screen.getByTestId('bar').textContent).toContain('Exchange 1 of');
    expect(screen.getByRole('button', { name: 'Record your answer' })).toBeTruthy();
    expect(examiner.speak).toHaveBeenCalledWith(`Pardon ? ${examCard.tasks[0].promptFr}`, 0);
  });

  it('a hesitation sound alone counts as silence', async () => {
    await startExamCard();
    await answer('euh...', /Pardon \?/);
    expect(screen.queryByTestId('drill-answer-card-0')).toBeNull();
  });

  it('after two silent tries it moves on, shows the exchange as missed, and records nothing', async () => {
    await startExamCard();
    await answer('', /Pardon \?/);
    await answer('', examCard.tasks[1].promptFr);
    expect(screen.getByTestId('bar').textContent).toContain('Exchange 2 of');
    const missed = screen.getByTestId('drill-answer-card-0');
    expect(within(missed).getByText(/No response/)).toBeTruthy();
    expect(within(missed).getByText(examCard.tasks[0].modelShort)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Leave the role play'));
    expect(drillRecorder.record).not.toHaveBeenCalled();
  });

  it('a short answer that covers the task gets ticks and the short model, with no mark and no AI wording', async () => {
    await startExamCard();
    await answer(examCard.tasks[0].modelShort, examCard.tasks[1].promptFr);
    const card = screen.getByTestId('drill-answer-card-0');
    expect(within(card).getByText(/covered/)).toBeTruthy();
    expect(within(card).queryByText(/not covered/)).toBeNull();
    expect(within(card).getByText(examCard.tasks[0].modelShort)).toBeTruthy();
    expect(within(card).queryByText(/offline|graded|vocabulary|style|score|\d+\s*\/\s*\d+/i)).toBeNull();
    expect(screen.queryByText('Redo')).toBeNull();
  });

  it('a half-answered two-part task shows one tick, one cross and one tip', async () => {
    await startExamCard();
    for (let i = 0; i < 3; i++) await answer(examCard.tasks[i].modelShort, examCard.tasks[i + 1].promptFr);
    await answer("Le musée.", examCard.tasks[4].promptFr);
    const card = screen.getByTestId('drill-answer-card-3');
    expect(within(card).getAllByText(/: covered/)).toHaveLength(1);
    expect(within(card).getAllByText(/: not covered/)).toHaveLength(1);
    expect(within(card).getByText(/Still to say/)).toBeTruthy();
  });

  it('"Try again" is explained, practice only, and stays until the card is left', async () => {
    await startExamCard();
    await answer('Je ne sais pas.', examCard.tasks[1].promptFr);
    await answer(examCard.tasks[1].modelShort, examCard.tasks[2].promptFr);
    const first = screen.getByTestId('drill-answer-card-0');
    expect(within(first).getByRole('button', { name: /Try again/ })).toBeTruthy();
    expect(within(first).getByText('Practice only — in the exam you get one go.')).toBeTruthy();
    expect(screen.queryByText(/left\)/)).toBeNull();

    // retry the first exchange with a covering answer
    mic.heard.push(examCard.tasks[0].modelShort);
    fireEvent.click(within(first).getByRole('button', { name: /Try again/ }));
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Stop recording' })); });
    await waitFor(() => expect(within(screen.getByTestId('drill-answer-card-0')).queryByText(/not covered/)).toBeNull());

    // leaving records each answered exchange once, with the final answer
    fireEvent.click(screen.getByLabelText('Leave the role play'));
    expect(drillRecorder.record).toHaveBeenCalledTimes(2);
    const [one, two] = drillRecorder.record.mock.calls.map((c) => c[0]);
    expect(one).toMatchObject({ cardId: examCard.id, step: 0, complete: true, transcript: examCard.tasks[0].modelShort });
    expect(two).toMatchObject({ step: 1, complete: true });
    expect(dispatch.fn.mock.calls.filter(([a]) => a.type === 'ADD_SESSION')).toHaveLength(2);
  });

  it('a retry that hears nothing keeps the earlier answer', async () => {
    await startExamCard();
    await answer(examCard.tasks[0].modelShort, examCard.tasks[1].promptFr);
    mic.heard.push('');
    fireEvent.click(within(screen.getByTestId('drill-answer-card-0')).getByRole('button', { name: /Try again/ }));
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Stop recording' })); });
    expect(await screen.findByText(/earlier answer stands/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Leave the role play'));
    expect(drillRecorder.record).toHaveBeenCalledWith(expect.objectContaining({ step: 0, complete: true }));
  });

  it('records full credit only where every part was covered', async () => {
    await startExamCard();
    await answer('Je ne sais pas.', examCard.tasks[1].promptFr);
    await answer(examCard.tasks[1].modelShort, examCard.tasks[2].promptFr);
    fireEvent.click(screen.getByLabelText('Leave the role play'));
    const calls = drillRecorder.record.mock.calls.map((c) => c[0]);
    expect(calls.map((c) => c.complete)).toEqual([false, true]);
    expect(calls[0]).toMatchObject({ streakDays: 2, totalSessionsBefore: 4 });
    expect(calls[1]).toMatchObject({ totalSessionsBefore: 5 });
  });

  it('under exam conditions there is no Try again and no card until the last exchange', async () => {
    await startExamCard({ examConditions: true });
    await answer(examCard.tasks[0].modelShort, examCard.tasks[1].promptFr);
    expect(screen.queryByTestId('drill-answer-card-0')).toBeNull();
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
    expect(screen.getByText(/checked once the last exchange is done/)).toBeTruthy();

    for (let i = 1; i < examCard.tasks.length; i++) {
      await answer(examCard.tasks[i].modelShort, i + 1 < examCard.tasks.length ? examCard.tasks[i + 1].promptFr : /fin du jeu de rôle/);
    }
    expect(await screen.findByRole('heading', { name: 'Role play finished' })).toBeTruthy();
    expect(screen.getAllByTestId(/^drill-answer-card-/)).toHaveLength(examCard.tasks.length);
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
  });

  it('the recorder hint says short is fine', async () => {
    await startExamCard();
    expect(screen.getByText('Short is fine — answer every part.')).toBeTruthy();
    expect(screen.queryByText(/one or two full sentences/)).toBeNull();
  });

  it('the card prep no longer asks for full sentences', () => {
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${examCard.id}`));
    expect(screen.queryByText(/full sentences/)).toBeNull();
    expect(screen.getByRole('switch', { name: /Exam conditions/ })).toBeTruthy();
  });
});

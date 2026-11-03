// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { STORY_CARDS, hasEnglishInstructions } from '../../../data/storyCards';
import { drillSessionId } from '../../../features/rolePlayDrill/drillProgress';

const history = vi.hoisted(() => ({ ids: [] as string[] }));
const voice = vi.hoisted(() => ({ french: true }));

vi.mock('../../../components/TopContextBar', () => ({
  TopContextBar: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header data-testid="bar">{title} · {subtitle}</header>
  ),
}));
vi.mock('../../../components/layout/shellChrome', () => ({ useShowNavRail: () => {} }));
vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ state: { profile: { streak_days: 0, sessions_count: 0 } }, dispatch: vi.fn() }),
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
vi.mock('../../../features/recording/useRecording', () => ({
  useRecording: () => ({
    isRecording: false, elapsedTime: 0, waveData: [], transcript: '', audioBlob: null,
    lastActivityAt: null, micLevel: { subscribe: () => () => {}, read: () => 0 }, start: vi.fn(), stop: vi.fn(),
    audioBlobPromise: vi.fn(), sttSupported: true, sttError: null,
  }),
}));
vi.mock('../../../services/api/apiClient', () => ({ getAIFeedback: vi.fn() }));
vi.mock('../../../services/analytics/analyticsService', () => ({
  getSessionHistory: () => history.ids.map((id) => ({ id })),
}));
vi.mock('../../../services/exam/examinerVoice', () => ({
  primeExaminerVoice: vi.fn(),
  speakExaminerText: vi.fn().mockResolvedValue(undefined),
  stopExaminerVoice: vi.fn(),
  getExaminerVoiceGeneration: () => 0,
  isExaminerVoiceMuted: () => false,
  hasFrenchVoice: () => voice.french,
}));

import { RolePlayDrill } from '../RolePlayDrill';

const guidedCard = STORY_CARDS.find(hasEnglishInstructions)!;

beforeEach(() => {
  history.ids = [];
  voice.french = true;
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
    expect(screen.getByRole('heading', { name: 'With English instructions' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Exam style' })).toBeTruthy();
    expect(screen.getAllByTestId(/^drill-card-/)).toHaveLength(STORY_CARDS.length);
    expect(within(screen.getByTestId(`drill-card-${guidedCard.id}`)).getByText('Done')).toBeTruthy();
    expect(screen.getByText(/cards done/).textContent).toContain(`1 of ${STORY_CARDS.length}`);
  });

  it('shows the card with its English tasks, then starts the role play with the first examiner line', async () => {
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${guidedCard.id}`));
    expect(screen.getByRole('heading', { name: 'Your tasks' })).toBeTruthy();
    expect(screen.getByText(guidedCard.tasks[0].promptEn!)).toBeTruthy();

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

  it('cannot hide the examiner line on a device with no French voice', () => {
    voice.french = false;
    renderDrill();
    fireEvent.click(screen.getByTestId(`drill-card-${guidedCard.id}`));
    expect((screen.getByRole('switch', { name: /Listen only/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

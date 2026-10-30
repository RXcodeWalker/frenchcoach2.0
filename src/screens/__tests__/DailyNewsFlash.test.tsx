// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const addXP = vi.hoisted(() => vi.fn());
const start = vi.hoisted(() => vi.fn());

vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ subtitle }: { subtitle?: string }) => <header data-testid="subtitle">{subtitle}</header>,
}));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ state: { profile: { streak_days: 0, sessions_count: 0 } }, dispatch: vi.fn() }),
  dispatchAddXP: addXP,
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
vi.mock('../../features/recording/useRecording', () => ({
  useRecording: () => ({
    isRecording: false, elapsedTime: 0, waveData: [], transcript: 'un festival à Cannes', audioBlob: null,
    lastActivityAt: null, micLevel: { subscribe: () => () => {}, read: () => 0 }, start, stop: vi.fn(),
    audioBlobPromise: vi.fn(), sttSupported: true, sttError: null,
  }),
}));
vi.mock('../../services/api/apiClient', () => ({
  getAIFeedback: vi.fn(),
  getDailyNews: vi.fn().mockResolvedValue({
    id: 'n1', date: '2026-10-30', headline: 'Festival de Cannes',
    transcript: 'Le festival a ouvert. Les stars sont là.', translation: 'The festival opened. The stars are here.',
    keywords: ['festival', 'stars', 'ouverture'], summaryPoints: ['Festival opened'],
  }),
}));

import { DailyNewsFlash } from '../DailyNewsFlash';

beforeEach(() => {
  localStorage.clear();
  addXP.mockClear();
  start.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true, value: { speak: vi.fn(), cancel: vi.fn() },
  });
  (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {};
});
afterEach(cleanup);

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/daily-news']}>
      <Routes>
        <Route path="/daily-news" element={<DailyNewsFlash />} />
        <Route path="/explore" element={<p>Explore</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DailyNewsFlash', () => {
  it('shows the headline, the Listen step and a hidden transcript', async () => {
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'Festival de Cannes' })).toBeTruthy();
    expect(screen.getByLabelText('Progress').querySelector('[aria-current="step"]')?.textContent).toContain('Listen');
    expect(screen.queryByTestId('news-transcript')).toBeNull();
  });

  it('charges 5 XP once when the transcript is revealed', async () => {
    renderScreen();
    fireEvent.click(await screen.findByTestId('news-reveal'));
    expect(screen.getByTestId('news-transcript').textContent).toContain('Le festival a ouvert.');
    expect(addXP).toHaveBeenCalledTimes(1);
    expect(addXP).toHaveBeenCalledWith(expect.anything(), -5, 'daily_news');
    expect(screen.queryByTestId('news-reveal')).toBeNull();
  });

  it('starts recording, moves to Report and ticks the key words already said', async () => {
    renderScreen();
    fireEvent.click(await screen.findByTestId('news-start'));
    expect(start).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByLabelText('Key words')).toBeTruthy());
    const used = screen.getByLabelText('Key words').querySelectorAll('li');
    expect(used[0].textContent).toContain('(used)');
    expect(used[1].textContent).not.toContain('(used)');
  });
});

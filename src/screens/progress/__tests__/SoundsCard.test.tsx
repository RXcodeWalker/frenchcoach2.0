// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BENCHMARK_VERSION } from '../../../domain/pronunciation/lab/benchmark';
import { checkTrend, type MonthlyCheckResult } from '../../../domain/pronunciation/lab/monthlyCheck';
import { soundProgress } from '../../../domain/pronunciation/lab/soundProgress';
import { LAB_THRESHOLDS_VERSION } from '../../../domain/pronunciation/lab/thresholds';
import type { DatedObservation, ScoredFamilyId } from '../../../domain/pronunciation/lab/soundFamilies';
import { SoundsCard } from '../SoundsCard';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigateMock }));

const evidence = (family: ScoredFamilyId, accuracy: number): DatedObservation[] =>
  Array.from({ length: 6 }, (_, i) => ({ family, accuracy, basis: 'phoneme' as const, day: i % 2 ? '2026-11-01' : '2026-11-02' }));

const check = (day: string, clear: number): MonthlyCheckResult => ({
  day,
  benchmarkVersion: BENCHMARK_VERSION,
  thresholdsVersion: LAB_THRESHOLDS_VERSION,
  sentences: [0, 1, 2, 3, 4].map((index) => ({ index, wordsClear: clear, wordsTotal: 8 })),
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

function renderCard(props: Partial<React.ComponentProps<typeof SoundsCard>> = {}) {
  return render(
    <MemoryRouter>
      <SoundsCard progress={soundProgress([])} latest={null} trend={null} checkDue today="2026-11-28" signedIn {...props} />
    </MemoryRouter>,
  );
}

describe('SoundsCard', () => {
  it('names the strongest and weakest sounds, each with a glyph and a word, never a number', () => {
    const progress = soundProgress([...evidence('frenchR', 92), ...evidence('uOu', 85), ...evidence('eu', 40), ...evidence('gnIll', 30)]);
    renderCard({ progress });
    const text = screen.getByTestId('progress-sounds').textContent ?? '';
    expect(text).toContain('Going well');
    expect(text).toContain('Worth working on');
    expect(text).toMatch(/French R/i);
    expect(text).not.toMatch(/\b(92|85|40|30)\b/);
  });

  it('says what it needs when there is no data, and asks guests to sign in', () => {
    renderCard();
    expect(screen.getByText(/Practise a sentence in Learn/)).toBeTruthy();
    cleanup();
    renderCard({ signedIn: false });
    expect(screen.getByText(/Sign in to check how your words sound/)).toBeTruthy();
  });

  it('offers the monthly check when it is due, and goes to it', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Take the monthly check' }));
    expect(navigateMock).toHaveBeenCalledWith('/learn/sounds/check');
  });

  it('shows the last check as "N of M words clear" and the next one when done this month', () => {
    renderCard({ latest: check('2026-11-03', 6), checkDue: false });
    const text = screen.getByTestId('progress-sounds').textContent ?? '';
    expect(text).toContain('30 of 40 words clear');
    expect(text).toContain('Your next one is in December');
    expect(screen.queryByRole('button', { name: 'Take the monthly check' })).toBeNull();
  });

  it('shows the trend only once two comparable checks exist', () => {
    const checks = [check('2026-10-02', 4), check('2026-11-03', 6)];
    renderCard({ latest: checks[1], trend: checkTrend(checks), checkDue: false });
    expect(screen.getByTestId('progress-sounds').textContent).toContain('2 Oct: 20 of 40 words clear. 3 Nov: 30 of 40 words clear.');
    cleanup();
    renderCard({ latest: checks[0], trend: checkTrend([checks[0]]), checkDue: false });
    expect(screen.getByTestId('progress-sounds').textContent).toContain('side by side');
  });
});

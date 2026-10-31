// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ subtitle, onBack, backLabel }: { subtitle?: string; onBack?: () => void; backLabel?: string }) => (
    <header>
      <span data-testid="subtitle">{subtitle}</span>
      <button onClick={onBack}>{backLabel}</button>
    </header>
  ),
}));

import { RapidFire } from '../RapidFire';
import { getBest } from '../../features/rapidFire/bests';
import { missedInSet, recordMissed } from '../../features/rapidFire/missed';
import { getWordSet } from '../../features/rapidFire/wordBank';

// Deterministic shuffles: Math.random() === 0 keeps a stable order.
let randomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => {
  cleanup();
  randomSpy.mockRestore();
  vi.useRealTimers();
});

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/rapid-fire']}>
      <Routes>
        <Route path="/rapid-fire" element={<RapidFire />} />
        <Route path="/explore" element={<p>Explore</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
// React only schedules the next timer once it has rendered, so step the clock in small acts.
const tick = async (ms: number) => {
  for (let left = ms; left > 0; left -= 250) await act(async () => { await vi.advanceTimersByTimeAsync(Math.min(250, left)); });
};
const click = (el: HTMLElement) => act(async () => { fireEvent.click(el); });
const type = (value: string) => act(async () => { fireEvent.change(screen.getByLabelText('Your French translation'), { target: { value } }); });
const submit = () => click(screen.getByTestId('rf-check'));

/** The accepted French for the prompt on screen, looked up in the real word set. */
function answerFor(setId: string): string {
  const prompt = screen.getByTestId('rf-prompt').textContent;
  const w = getWordSet(setId)!.words.find(x => x.prompt === prompt);
  if (!w) throw new Error(`no word for "${prompt}"`);
  return w.answers[0];
}

async function startRun(setId = 'phrases') {
  await click(screen.getByTestId(`rf-set-${setId}`));
  await click(screen.getByTestId('rf-start'));
  expect(screen.getByTestId('rf-countdown').textContent).toBe('3');
  await tick(4000);
  expect(screen.getByTestId('rf-prompt')).toBeTruthy();
}

describe('Rapid Fire screen', () => {
  it('opens on the setup with the rules, a word set picker and one primary Start', () => {
    renderScreen();
    expect(screen.getByText('Translate as many words as you can')).toBeTruthy();
    expect(screen.getByTestId('rf-set-mixed').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('rf-set-school')).toBeTruthy();
    expect(screen.getByTestId('rf-best').textContent).toContain('No best yet');
    expect(screen.getByText(/doesn.t earn XP yet/)).toBeTruthy();
  });

  it('selecting a set marks it, and Back leaves for Explore', async () => {
    renderScreen();
    await click(screen.getByTestId('rf-set-food'));
    expect(screen.getByTestId('rf-set-food').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('rf-set-mixed').getAttribute('aria-pressed')).toBe('false');
    await click(screen.getByRole('button', { name: 'Back to Explore' }));
    expect(screen.getByText('Explore')).toBeTruthy();
  });

  it('counts down 3-2-1, then scores a correct answer and moves to a new word', async () => {
    renderScreen();
    await startRun();
    const first = screen.getByTestId('rf-prompt').textContent;
    expect(screen.getByTestId('rf-time').textContent).toMatch(/^(59|60)s$/);
    expect(screen.getByTestId('rf-score').textContent).toBe('0');

    await type(answerFor('phrases'));
    await submit();
    expect(screen.getByTestId('rf-feedback-correct')).toBeTruthy();
    expect(screen.getByTestId('rf-score').textContent).toBe('10');

    await tick(500);
    expect(screen.getByTestId('rf-prompt').textContent).not.toBe(first);
    expect((screen.getByLabelText('Your French translation') as HTMLInputElement).value).toBe('');
  });

  it('shows the correction for a miss, holds the clock, and Enter moves on', async () => {
    renderScreen();
    await startRun();
    await type('totalement faux');
    await submit();
    expect(screen.getByTestId('rf-feedback-wrong')).toBeTruthy();
    expect(screen.getByRole('img', { name: '2 of 3 hearts left' })).toBeTruthy();
    const time = screen.getByTestId('rf-time').textContent;
    await tick(1000);
    expect(screen.getByTestId('rf-time').textContent).toBe(time);

    await submit(); // the button reads "Next" now
    expect(screen.queryByTestId('rf-feedback-wrong')).toBeNull();
  });

  it('Escape pauses (the back handler), and Resume continues', async () => {
    renderScreen();
    await startRun();
    await tick(2000);
    const left = screen.getByTestId('rf-time').textContent;
    await click(screen.getByRole('button', { name: 'Pause run' }));
    expect(screen.getByText('Paused')).toBeTruthy();
    await tick(5000);
    expect(screen.getByTestId('rf-time').textContent).toBe(left);
    await click(screen.getByRole('button', { name: 'Resume' }));
    await tick(1000);
    expect(screen.getByTestId('rf-time').textContent).not.toBe(left);
  });

  it('plays a full run: results, personal best saved, missed words drilled', async () => {
    renderScreen();
    await startRun();

    await type(answerFor('phrases'));
    await submit();
    await tick(500);
    await type('mauvaise réponse');
    await submit();
    await submit(); // Next

    await tick(61_000);

    expect(screen.getByText("Time's up")).toBeTruthy();
    expect(screen.getByTestId('rf-final-score').textContent).toBe('10');
    expect(screen.getByTestId('rf-new-best').textContent).toContain('First best set');
    expect(screen.getByTestId('rf-rank')).toBeTruthy();
    expect(screen.getByTestId('rf-tile-correct').textContent).toContain('1 of 2');
    expect(screen.getByTestId('rf-rows').querySelectorAll('li')).toHaveLength(1);
    expect(getBest('phrases')).toMatchObject({ score: 10, correct: 1 });

    // Drill the one missed word: get it right and the drill clears.
    await click(screen.getByTestId('rf-drill'));
    await tick(4000);
    expect(screen.getByTestId('subtitle').textContent).toBe('Missed words');
    await type(answerFor('phrases'));
    await submit();
    await tick(500);
    expect(screen.getByText('All cleared')).toBeTruthy();
    // A drill never touches the bests, and Play again returns to a full sprint on the same set.
    expect(getBest('phrases')?.score).toBe(10);
    expect(screen.queryByTestId('rf-new-best')).toBeNull();
    await click(screen.getByTestId('rf-again'));
    expect(screen.getByTestId('rf-countdown')).toBeTruthy();
  });

  it('ends the run when the third heart goes', async () => {
    renderScreen();
    await startRun();
    for (let i = 0; i < 3; i++) {
      await type('faux');
      await submit();
      await submit();
    }
    expect(screen.getByText('Out of hearts')).toBeTruthy();
    expect(screen.getByTestId('rf-rows').querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByTestId('rf-drill').textContent).toContain('Practise 3 missed words');
    expect(getBest('phrases')).toBeUndefined();
  });

  it('a clean run says so', async () => {
    renderScreen();
    await startRun();
    await type(answerFor('phrases'));
    await submit();
    await tick(500);
    await click(screen.getByRole('button', { name: 'Pause run' }));
    await click(screen.getByRole('button', { name: 'End run' }));
    expect(screen.getByText('Run ended')).toBeTruthy();
    expect(screen.getByTestId('rf-clean').textContent).toContain('A clean run');
    expect(getBest('phrases')).toBeUndefined();
  });

  it('collects misses, locks the missed sprint until there are enough, then plays it without touching the best', async () => {
    renderScreen();
    await click(screen.getByTestId('rf-set-phrases'));
    expect(screen.getByTestId('rf-missed-count').textContent).toContain('Nothing missed yet');
    expect((screen.getByTestId('rf-start-missed') as HTMLButtonElement).disabled).toBe(true);

    await startRun();
    for (let i = 0; i < 3; i++) { await type('faux'); await submit(); await submit(); }
    await click(screen.getByRole('button', { name: 'Change word set' }));
    expect(screen.getByTestId('rf-missed-count').textContent).toContain('3 missed so far');
    expect((screen.getByTestId('rf-start-missed') as HTMLButtonElement).disabled).toBe(true);

    // Seed enough more to unlock it.
    const phrases = getWordSet('phrases')!;
    const entries = phrases.words.slice(10, 14).map(word => ({ word, typed: '', kind: 'wrong' as const, expected: word.answers[0], accentsMissed: false }));
    recordMissed(entries);
    await click(screen.getByTestId('rf-set-mixed'));
    await click(screen.getByTestId('rf-set-phrases'));
    expect(missedInSet(phrases)).toHaveLength(7);
    expect((screen.getByTestId('rf-start-missed') as HTMLButtonElement).disabled).toBe(false);

    await click(screen.getByTestId('rf-start-missed'));
    await tick(4000);
    expect(screen.getByTestId('subtitle').textContent).toContain('Missed cards');
    const prompt = screen.getByTestId('rf-prompt').textContent;
    expect(missedInSet(phrases).some(w => w.prompt === prompt)).toBe(true);

    await type(answerFor('phrases'));
    await submit();
    await click(screen.getByRole('button', { name: 'Pause run' }));
    await click(screen.getByRole('button', { name: 'End run' }));
    // The right answer cleared that card; the run never became the set's best.
    expect(missedInSet(phrases)).toHaveLength(6);
    expect(getBest('phrases')).toBeUndefined();
  });
});

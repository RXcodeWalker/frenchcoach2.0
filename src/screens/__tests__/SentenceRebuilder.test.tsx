// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ subtitle, onBack, backLabel }: { subtitle?: string; onBack?: () => void; backLabel?: string }) => (
    <header>
      <span data-testid="subtitle">{subtitle}</span>
      <button onClick={onBack}>{backLabel}</button>
    </header>
  ),
}));

import { SentenceRebuilder } from '../SentenceRebuilder';
import { REBUILD_QUESTIONS } from '../../data/rebuildQuestions';
import { STORAGE_KEYS } from '../../services/persistence/storage';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/sentence-rebuilder']}>
      <Routes>
        <Route path="/sentence-rebuilder" element={<SentenceRebuilder />} />
        <Route path="/explore" element={<p>Explore hub</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const click = (el: HTMLElement) => act(() => { fireEvent.click(el); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const bank = () => screen.getByTestId('rebuilder-bank');
const line = () => screen.getByTestId('rebuilder-line');

/** The sentence on screen, found by its English prompt. */
function current() {
  const english = screen.getByTestId('rebuilder-english').textContent;
  const q = REBUILD_QUESTIONS.find(x => x.english === english);
  if (!q) throw new Error(`no sentence for "${english}"`);
  return q;
}

/** Taps words from the bank, in order. Tiles read without the opening capital or trailing comma. */
function tap(words: string[]) {
  for (const w of words) {
    const bare = w.replace(/[,.;!]+$/u, '');
    const target = within(bank()).getAllByRole('button').find(b => b.textContent?.toLowerCase() === bare.toLowerCase());
    if (!target) throw new Error(`no bank tile "${w}"`);
    click(target);
  }
}

const solveCurrent = () => {
  tap(current().fragments);
  click(screen.getByTestId('rebuilder-check'));
};

describe('Sentence Rebuilder screen', () => {
  it('has a distinct English prompt for every sentence, so a round can be read off the screen', () => {
    const english = REBUILD_QUESTIONS.map(q => q.english);
    expect(new Set(english).size).toBe(english.length);
  });

  it('opens on the setup with one primary action, says it earns no XP, and Back returns to Explore', () => {
    renderScreen();
    expect(screen.getByTestId('rebuilder-start')).toBeTruthy();
    expect(screen.getByText(/doesn't earn XP/)).toBeTruthy();
    click(screen.getByRole('button', { name: 'Back to Explore' }));
    expect(screen.getByText('Explore hub')).toBeTruthy();
  });

  it('remembers the chosen mode and level', () => {
    renderScreen();
    click(screen.getByRole('button', { name: /Tricky/ }));
    click(screen.getByRole('button', { name: 'Stretch' }));
    click(screen.getByTestId('rebuilder-start'));
    expect(screen.getByTestId('subtitle').textContent).toBe('Tricky');
    cleanup();
    renderScreen();
    expect(screen.getByRole('button', { name: /Tricky/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Stretch' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('plays a sentence: tap the words, check, see why, move on', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    expect(screen.getByTestId('rebuilder-position').textContent).toBe('Sentence 1 of 8');
    const q = current();

    tap(q.fragments);
    expect(within(line()).getAllByRole('button')).toHaveLength(q.fragments.length);
    click(screen.getByTestId('rebuilder-check'));

    const answer = screen.getByTestId('rebuilder-answer');
    expect(answer.getAttribute('data-outcome')).toBe('clean');
    expect(screen.getByTestId('rebuilder-french').textContent).toBe(q.french);
    expect(within(answer).getByText(q.explanation)).toBeTruthy();
    expect(Number(screen.getByTestId('rebuilder-score').textContent)).toBeGreaterThanOrEqual(100);

    click(screen.getByTestId('rebuilder-next'));
    expect(screen.getByTestId('rebuilder-position').textContent).toBe('Sentence 2 of 8');
  });

  it('marks a wrong line, refuses a second check until a word moves, and lets a word be taken back', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    const q = current();

    tap([...q.fragments].reverse());
    click(screen.getByTestId('rebuilder-check'));
    expect(screen.getByTestId('rebuilder-status').textContent).toMatch(/in the right place/);
    expect((screen.getByTestId('rebuilder-check') as HTMLButtonElement).disabled).toBe(true);

    click(within(line()).getAllByRole('button')[0]);
    expect((screen.getByTestId('rebuilder-check') as HTMLButtonElement).disabled).toBe(true); // still one word short
    expect(screen.getByTestId('rebuilder-status').textContent).toMatch(/words placed/);
  });

  it('shows the answer after three misses, and the sentence returns once', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    const q = current();
    for (let i = 0; i < 3; i++) {
      if (i > 0) click(screen.getByRole('button', { name: 'Clear' }));
      tap([...q.fragments].reverse());
      click(screen.getByTestId('rebuilder-check'));
    }
    const answer = screen.getByTestId('rebuilder-answer');
    expect(answer.getAttribute('data-outcome')).toBe('revealed');
    expect(within(answer).getByText(/You wrote/)).toBeTruthy();
    expect(within(answer).getByText(/comes back once more/)).toBeTruthy();
    click(screen.getByTestId('rebuilder-next'));
    expect(screen.getByTestId('rebuilder-position').textContent).toBe('Sentence 2 of 9');
  });

  it('a hint sets down a word and says what it costs; skip reveals the sentence', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    click(screen.getByTestId('rebuilder-hint'));
    expect(within(line()).getAllByRole('button')).toHaveLength(1);
    click(screen.getByTestId('rebuilder-skip'));
    expect(screen.getByTestId('rebuilder-answer').getAttribute('data-outcome')).toBe('skipped');
  });

  it('plays a whole round, ends on results with the score, and records a best and mastery', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    for (let i = 0; i < 8; i++) {
      solveCurrent();
      click(screen.getByTestId('rebuilder-next'));
    }
    const score = Number(screen.getByTestId('rebuilder-final-score').textContent?.replace(/,/g, ''));
    expect(score).toBeGreaterThan(800);
    expect(screen.getByText('New best')).toBeTruthy();
    expect(screen.getByText(/Every sentence landed/)).toBeTruthy();
    expect(screen.getByText('Round complete')).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith(STORAGE_KEYS.sentenceRebuilder)) as string) as string);
    expect(stored.bests['classic:mixed'].score).toBe(score);
    expect(Object.keys(stored.clean)).toHaveLength(8);

    click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByTestId('rebuilder-position').textContent).toBe('Sentence 1 of 8');
  });

  it('offers a drill of the sentences missed, and it records no best', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    const missedFirst = current();
    click(screen.getByTestId('rebuilder-skip'));
    click(screen.getByTestId('rebuilder-next'));
    for (let guard = 0; guard < 12 && screen.queryByTestId('rebuilder-position'); guard++) {
      if (current().id === missedFirst.id) {
        click(screen.getByTestId('rebuilder-skip')); // missing the second go too
      } else {
        solveCurrent();
      }
      click(screen.getByTestId('rebuilder-next'));
    }
    const review = screen.getByTestId('rebuilder-review');
    expect(within(review).getByText(missedFirst.french)).toBeTruthy();

    click(screen.getByRole('button', { name: /Drill the 1 miss/ }));
    expect(screen.getByTestId('subtitle').textContent).toBe('Classic · Drill');
    expect(current().id).toBe(missedFirst.id);
    solveCurrent();
    click(screen.getByTestId('rebuilder-next'));
    expect(screen.getByText('Drill complete')).toBeTruthy();
    expect(screen.queryByText('New best')).toBeNull();
  });

  it('asks before leaving a round, and keeps playing on request', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    click(screen.getByRole('button', { name: 'Leave round' }));
    expect(screen.getByTestId('rebuilder-paused')).toBeTruthy();
    expect(screen.queryByTestId('rebuilder-english')).toBeNull();
    click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.getByTestId('rebuilder-english')).toBeTruthy();

    click(screen.getByRole('button', { name: 'Leave round' }));
    click(within(screen.getByTestId('rebuilder-paused')).getByRole('button', { name: 'Leave round' }));
    expect(screen.getByTestId('rebuilder-start')).toBeTruthy();
  });

  it('Speed runs a clock, hides the sentence while paused, and ends at zero', () => {
    renderScreen();
    click(screen.getByRole('button', { name: /Speed/ }));
    click(screen.getByTestId('rebuilder-start'));
    expect(screen.getByTestId('rebuilder-time').textContent).toBe('60s');
    advance(5000);
    expect(screen.getByTestId('rebuilder-time').textContent).toMatch(/5[45]s/);

    click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy();
    expect(screen.queryByTestId('rebuilder-english')).toBeNull();
    advance(30_000);
    click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.getByTestId('rebuilder-time').textContent).toMatch(/5[45]s/);

    advance(61_000);
    expect(screen.getByText("Time's up", { exact: false })).toBeTruthy();
  });

  it('Enter checks a full line and moves on from the answer; Backspace takes the last word back', () => {
    renderScreen();
    click(screen.getByTestId('rebuilder-start'));
    const q = current();
    tap(q.fragments.slice(0, 2));
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }); });
    expect(within(line()).getAllByRole('button')).toHaveLength(1);

    tap(q.fragments.slice(1));
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
    expect(screen.getByTestId('rebuilder-answer')).toBeTruthy();
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
    expect(screen.getByTestId('rebuilder-position').textContent).toBe('Sentence 2 of 8');
  });
});

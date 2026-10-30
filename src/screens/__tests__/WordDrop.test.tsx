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

import { WordDrop } from '../WordDrop';
import { getWordPool, playWords } from '../../features/wordDrop/wordPool';

const answers = new Map(playWords(getWordPool(), 'fr-en').map(w => [w.text, w.accept[0]]));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
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
    <MemoryRouter initialEntries={['/word-drop']}>
      <Routes>
        <Route path="/word-drop" element={<WordDrop />} />
        <Route path="/explore" element={<p>Explore hub</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const click = (el: HTMLElement) => act(() => { fireEvent.click(el); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const field = () => screen.getByRole('group', { name: 'Falling words' });
const fallingFrench = () => [...field().querySelectorAll('span[lang="fr"]')].map(e => e.textContent ?? '');

describe('Word Drop screen', () => {
  it('opens on the setup with a single primary action, and Back returns to Explore', () => {
    renderScreen();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy();
    expect(screen.getByText(/doesn't earn XP/)).toBeTruthy();
    click(screen.getByRole('button', { name: 'Back to Explore' }));
    expect(screen.getByText('Explore hub')).toBeTruthy();
  });

  it('lets the learner choose direction, pace and topic, and remembers it', () => {
    renderScreen();
    click(screen.getByRole('button', { name: /English → French/ }));
    click(screen.getByRole('button', { name: /Quick/ }));
    const food = screen.getByRole('button', { name: /Food/ });
    click(food);
    expect(food.getAttribute('aria-pressed')).toBe('true');
    click(screen.getByRole('button', { name: 'Start game' }));
    expect(JSON.parse(localStorage.getItem('frenchCoach_wordDropBests') ?? '{}').last).toEqual({ direction: 'en-fr', pace: 'quick', topic: 'food' });
  });

  it('drops a word, clears it when its meaning is typed, and scores it', () => {
    renderScreen();
    click(screen.getByRole('button', { name: 'Start game' }));
    expect(screen.getByTestId('word-drop-score').textContent).toBe('0');
    advance(1200);
    const [first] = fallingFrench();
    expect(first).toBeTruthy();

    const input = screen.getByLabelText('Type the English meaning') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: answers.get(first)! } }); });
    expect(Number(screen.getByTestId('word-drop-score').textContent)).toBeGreaterThanOrEqual(10);
    expect(input.value).toBe('');
    expect(fallingFrench()).not.toContain(first);
  });

  it('pauses with Escape-style pause and holds the field still', () => {
    renderScreen();
    click(screen.getByRole('button', { name: 'Start game' }));
    advance(1200);
    click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeTruthy();
    const before = field().innerHTML;
    advance(3000);
    expect(field().innerHTML).toBe(before);
    click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Resume' }));
    expect(screen.queryByRole('dialog', { name: 'Paused' })).toBeNull();
  });

  it('ends on three misses, shows the words to practise, stores nothing for a zero score, and plays again', () => {
    renderScreen();
    click(screen.getByRole('button', { name: 'Start game' }));
    advance(120_000);
    expect(screen.getByText('Game over')).toBeTruthy();
    expect(screen.getByText('Words to practise')).toBeTruthy();
    expect(screen.getByTestId('word-drop-review').children.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: /Drill the \d+ missed words/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('frenchCoach_wordDropBests') ?? '{}').bests).toEqual({});
    click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByTestId('word-drop-score').textContent).toBe('0');
  });

  it('writes no XP, session or streak: only its own storage key changes', () => {
    renderScreen();
    click(screen.getByRole('button', { name: 'Start game' }));
    advance(120_000);
    const keys = Object.keys(localStorage);
    expect(keys.every(k => k.startsWith('frenchCoach_wordDropBests'))).toBe(true);
  });
});

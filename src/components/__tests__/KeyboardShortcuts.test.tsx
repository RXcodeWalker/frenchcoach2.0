// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { KeyboardShortcuts } from '../KeyboardShortcuts';
import { registerBackHandler } from '../../lib/keyboardShortcuts';

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function setup(initial: string | string[] = '/') {
  const entries = Array.isArray(initial) ? initial : [initial];
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <KeyboardShortcuts />
      <Routes>
        <Route path="*" element={<><Where /><textarea aria-label="note" /><button>btn</button></>} />
      </Routes>
    </MemoryRouter>,
  );
}

const press = (key: string, target: Element | Document = document.body, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(target, { key, ...init });
const where = () => screen.getByTestId('where').textContent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('KeyboardShortcuts', () => {
  it('g then a letter navigates', () => {
    setup();
    press('g');
    press('l');
    expect(where()).toBe('/learn');
    press('g');
    press('p');
    expect(where()).toBe('/progress');
  });

  it('a second key without g does nothing', () => {
    setup();
    press('l');
    expect(where()).toBe('/');
  });

  it('the chord expires', () => {
    setup();
    press('g');
    act(() => { vi.advanceTimersByTime(2000); });
    press('l');
    expect(where()).toBe('/');
  });

  it('an unknown second key cancels the chord', () => {
    setup();
    press('g');
    press('z');
    press('l');
    expect(where()).toBe('/');
  });

  it('stays quiet while typing and with modifiers', () => {
    setup();
    const note = screen.getByLabelText('note');
    press('g', note);
    press('l', note);
    expect(where()).toBe('/');
    press('g', document.body, { ctrlKey: true });
    press('l');
    expect(where()).toBe('/');
  });

  it('? opens the list, Escape or ? closes it, and chords pause while it is open', () => {
    setup();
    press('?', document.body, { shiftKey: true });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Go to Learn')).toBeTruthy();
    press('g');
    press('l');
    expect(where()).toBe('/');
    press('?', document.body, { shiftKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    press('?', document.body, { shiftKey: true });
    press('Escape', document);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Shift + a letter is the one-press form of the chord, but not while typing', () => {
    setup();
    press('L', document.body, { shiftKey: true });
    expect(where()).toBe('/learn');
    press('X', document.body, { shiftKey: true });
    expect(where()).toBe('/explore');
    press('P', screen.getByLabelText('note'), { shiftKey: true });
    expect(where()).toBe('/explore');
  });

  it('Escape goes back one page when there is history, else to Home, and does nothing on Home', () => {
    window.history.replaceState({ idx: 1 }, '');
    setup(['/learn', '/progress']);
    press('Escape');
    expect(where()).toBe('/learn');

    cleanup();
    window.history.replaceState({ idx: 0 }, '');
    setup('/progress');
    press('Escape');
    expect(where()).toBe('/');
    press('Escape');
    expect(where()).toBe('/');
  });

  it('Escape asks a screen\'s back handler first, and a handler returning true blocks navigation', () => {
    window.history.replaceState({ idx: 1 }, '');
    setup(['/learn', '/progress']);
    const handler = vi.fn(() => true);
    const off = registerBackHandler(handler);
    press('Escape');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(where()).toBe('/progress');
    off();
    press('Escape');
    expect(where()).toBe('/learn');
  });

  it('Escape leaves typing and open dialogs alone', () => {
    window.history.replaceState({ idx: 1 }, '');
    setup(['/learn', '/progress']);
    press('Escape', screen.getByLabelText('note'));
    expect(where()).toBe('/progress');
    press('?', document.body, { shiftKey: true });
    press('Escape', document);
    expect(where()).toBe('/progress');
  });
});

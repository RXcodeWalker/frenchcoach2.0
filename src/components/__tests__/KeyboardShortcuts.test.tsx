// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { KeyboardShortcuts } from '../KeyboardShortcuts';

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function setup(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
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
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyLabHistory, type LabHistory } from '../../../domain/pronunciation/lab/labHistory';
import { SCORED_FAMILIES } from '../../../domain/pronunciation/lab/soundFamilies';
import { localDay } from '../../../domain/pronunciation/lab/trickyWords';
import { SoundsHome } from '../SoundsHome';

afterEach(cleanup);

function renderHome(history: LabHistory = emptyLabHistory()) {
  const handlers = { onOpenToday: vi.fn(), onOpenGuide: vi.fn(), onOpenEar: vi.fn(), onOpenTricky: vi.fn(), onOpenPractise: vi.fn() };
  render(<SoundsHome history={history} {...handlers} />);
  return handlers;
}

describe('SoundsHome', () => {
  it('a new learner sees the ten scored sounds as plain guides, with no wall of "Not enough data" chips and no 0-100 number', () => {
    renderHome();
    for (const family of SCORED_FAMILIES) {
      const card = screen.getByTestId(`family-${family}`);
      expect(card.textContent).not.toMatch(/Not enough data yet/);
      expect(card.getAttribute('aria-label')).toMatch(/Open the guide$/);
    }
    expect(document.body.textContent).toMatch(/Practise a few sentences over a couple of days/);
    expect(document.body.textContent).not.toMatch(/\b\d{2,3}\b(?! (checked|different))/);
  });

  it('once any sound has a status, the others say "Not enough data yet"', () => {
    const observations = [];
    for (const day of ['2026-10-01', '2026-10-02']) {
      for (let i = 0; i < 3; i++) observations.push({ family: 'uOu' as const, accuracy: 92, basis: 'word' as const, day });
    }
    renderHome({ ...emptyLabHistory(), observations });
    expect(screen.getByTestId('family-uOu').textContent).toMatch(/Clear/);
    expect(screen.getByTestId('family-frenchR').textContent).toMatch(/Not enough data yet/);
  });

  it("puts one primary action first: today's 5 minutes", () => {
    const h = renderHome();
    const today = screen.getByTestId('sounds-today');
    expect(today.textContent).toMatch(/Today’s 5 minutes/);
    fireEvent.click(today);
    expect(h.onOpenToday).toHaveBeenCalledTimes(1);
  });

  it('liaison and elision have a guide but no status', () => {
    const h = renderHome();
    const liaison = screen.getByTestId('family-liaison');
    expect(liaison.textContent).toBe('Liaison');
    fireEvent.click(liaison);
    expect(h.onOpenGuide).toHaveBeenCalledWith('liaison');
    expect(screen.getByTestId('family-elision')).toBeTruthy();
  });

  it('reads each sound\'s status from the Lab history', () => {
    const observations = [];
    for (const day of ['2026-10-01', '2026-10-02']) {
      for (let i = 0; i < 3; i++) observations.push({ family: 'uOu' as const, accuracy: 92, basis: 'word' as const, day });
      for (let i = 0; i < 3; i++) observations.push({ family: 'frenchR' as const, accuracy: 40, basis: 'word' as const, day });
    }
    renderHome({ ...emptyLabHistory(), observations });
    expect(screen.getByTestId('family-uOu').textContent).toMatch(/Clear/);
    expect(screen.getByTestId('family-frenchR').textContent).toMatch(/Needs work/);
    expect(screen.getByRole('button', { name: 'The French R: Needs work. Open the guide' })).toBeTruthy();
  });

  it('opens a guide, ear training, the tricky deck and the sentence picker', () => {
    const h = renderHome();
    fireEvent.click(screen.getByTestId('family-nasalOn'));
    expect(h.onOpenGuide).toHaveBeenCalledWith('nasalOn');
    fireEvent.click(screen.getByTestId('sounds-ear'));
    fireEvent.click(screen.getByTestId('sounds-tricky'));
    fireEvent.click(screen.getByTestId('sounds-practise'));
    expect(h.onOpenEar).toHaveBeenCalled();
    expect(h.onOpenTricky).toHaveBeenCalled();
    expect(h.onOpenPractise).toHaveBeenCalled();
  });

  it('the tricky card says how many words are waiting', () => {
    const today = localDay(new Date());
    const entry = (lastDay: string) => ({ status: 'tricky' as const, practiseCount: 2, clearRun: 0, lastDay, lastClearDay: null });
    renderHome({ ...emptyLabHistory(), words: { tout: entry('2000-01-01'), vin: entry('2000-01-01'), bon: entry(today) } });
    expect(screen.getByTestId('sounds-tricky').textContent).toMatch(/2 words to practise/);
  });
});

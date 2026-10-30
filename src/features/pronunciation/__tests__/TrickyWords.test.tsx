// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const trackMock = vi.fn();
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: (...a: unknown[]) => trackMock(...a), captureError: vi.fn() }));
vi.mock('../WordDrill', () => ({
  WordDrill: ({ word, onClose }: { word: string; onClose: () => void }) => (
    <div data-testid="word-drill">
      drill:{word}
      <button onClick={onClose}>Close drill</button>
    </div>
  ),
}));

import { emptyLabHistory, type LabHistory } from '../../../domain/pronunciation/lab/labHistory';
import { localDay, type TrickyEntry } from '../../../domain/pronunciation/lab/trickyWords';
import { TrickyWords } from '../TrickyWords';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(() => {
  cleanup();
  trackMock.mockReset();
});

const tricky = (over: Partial<TrickyEntry> = {}): TrickyEntry => ({ status: 'tricky', practiseCount: 2, clearRun: 0, lastDay: '2000-01-01', lastClearDay: null, ...over });
const historyOf = (words: Record<string, TrickyEntry>): LabHistory => ({ ...emptyLabHistory(), words });

describe('TrickyWords', () => {
  it('explains an empty deck and offers a way to get words onto it', () => {
    const onPractise = vi.fn();
    render(<TrickyWords history={emptyLabHistory()} onPractiseSentence={onPractise} />);
    expect(screen.getByRole('heading', { name: 'No tricky words yet.' })).toBeTruthy();
    expect(screen.getByText(/twice in your Lab practice/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Practise a sentence' }));
    expect(onPractise).toHaveBeenCalled();
  });

  it('lists only tricky words, those due today first, and never a cleared or only-watched word', () => {
    const today = localDay(new Date());
    render(
      <TrickyWords
        history={historyOf({
          bon: tricky({ lastDay: today }),
          tout: tricky(),
          vin: { ...tricky(), status: 'watching', practiseCount: 1 },
          sous: { ...tricky(), status: 'cleared', practiseCount: 0, clearRun: 2 },
        })}
        onPractiseSentence={vi.fn()}
      />,
    );
    const items = screen.getAllByTestId(/^tricky-(?!words$)/).map((b) => b.getAttribute('data-testid'));
    expect(items).toEqual(['tricky-tout', 'tricky-bon']);
    expect(screen.getByRole('heading', { name: '1 word to practise today.' })).toBeTruthy();
    expect(screen.getByText('1 word has left your list so far.')).toBeTruthy();
    expect(screen.getByTestId('tricky-bon').textContent).toMatch(/Practised today/);
  });

  it('opens one word\'s drill in place, counts a Lab open once, and closes it again', () => {
    render(<TrickyWords history={historyOf({ tout: tricky(), vent: tricky() })} onPractiseSentence={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tricky-tout'));
    expect(screen.getByTestId('word-drill').textContent).toContain('drill:tout');
    expect(screen.getByTestId('tricky-vent')).toBeTruthy();
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ name: 'lab_opened', props: { entry: 'tricky_words' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close drill' }));
    expect(screen.queryByTestId('word-drill')).toBeNull();
    fireEvent.click(screen.getByTestId('tricky-vent'));
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('keeps an open card on screen after its word leaves the deck, until the learner closes it', () => {
    const { rerender } = render(<TrickyWords history={historyOf({ tout: tricky() })} onPractiseSentence={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tricky-tout'));
    rerender(<TrickyWords history={historyOf({ tout: tricky({ status: 'cleared', practiseCount: 0, clearRun: 2 }) })} onPractiseSentence={vi.fn()} />);
    expect(screen.getByTestId('word-drill').textContent).toContain('drill:tout');
    fireEvent.click(screen.getByRole('button', { name: 'Close drill' }));
    expect(screen.queryByTestId('word-drill')).toBeNull();
    expect(screen.getByRole('heading', { name: 'No tricky words yet.' })).toBeTruthy();
  });
});

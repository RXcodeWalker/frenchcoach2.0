// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QUESTIONS } from '../../../data/questions';
import { splitSentences } from '../../../domain/pronunciation/lab/sentences';
import { sentenceHasFamily } from '../../../domain/pronunciation/lab/practiceSentences';
import { PracticePicker } from '../PracticePicker';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

const list = () => within(screen.getByTestId('practice-picker')).getAllByRole('listitem');
const allModelSentences = new Set(QUESTIONS.flatMap((q) => splitSentences(q.modelAnswer)));

describe('PracticePicker', () => {
  it('offers model-answer sentences only as the recording script splits them (so ▶ Native is a recording)', () => {
    render(<PracticePicker notebookAnswers={[]} onPick={vi.fn()} />);
    const shown = list().map((li) => li.textContent ?? '');
    expect(shown.length).toBe(8);
    for (const sentence of shown) expect(allModelSentences.has(sentence)).toBe(true);
  });

  it('picking a sentence hands it to the Lab exactly as shown', () => {
    const onPick = vi.fn();
    render(<PracticePicker notebookAnswers={[]} onPick={onPick} />);
    const first = list()[0];
    fireEvent.click(within(first).getByRole('button'));
    expect(onPick).toHaveBeenCalledWith(first.textContent);
  });

  it('filters by sound: every sentence shown has that sound in its spelling', () => {
    render(<PracticePicker notebookAnswers={[]} initialFamily="liaison" onPick={vi.fn()} />);
    const shown = list().map((li) => li.textContent ?? '');
    expect(shown.length).toBeGreaterThan(0);
    for (const sentence of shown) expect(sentenceHasFamily(sentence, 'liaison')).toBe(true);
  });

  it('filters by topic and can show a different draw', () => {
    render(<PracticePicker notebookAnswers={[]} onPick={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'school' } });
    const school = new Set(QUESTIONS.filter((q) => q.topicKey === 'school').flatMap((q) => splitSentences(q.modelAnswer)));
    for (const li of list()) expect(school.has(li.textContent ?? '')).toBe(true);
    const before = list().map((li) => li.textContent).join('|');
    let changed = false;
    for (let i = 0; i < 6 && !changed; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Show different ones/ }));
      changed = list().map((li) => li.textContent).join('|') !== before;
    }
    expect(changed).toBe(true);
  });

  it('says so when nothing matches', () => {
    render(<PracticePicker notebookAnswers={['Oui.']} onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'My notebook' }));
    expect(screen.getByText(/No sentences with that sound here/)).toBeTruthy();
  });

  it('"My notebook" appears only when there are kept answers, and offers their sentences', () => {
    const { rerender } = render(<PracticePicker notebookAnswers={[]} onPick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'My notebook' })).toBeNull();
    rerender(<PracticePicker notebookAnswers={['Hier, je suis allé au cinéma avec mes amis. Nous avons vu un film très drôle.']} onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'My notebook' }));
    const shown = list().map((li) => li.textContent);
    expect(shown.sort()).toEqual(['Hier, je suis allé au cinéma avec mes amis.', 'Nous avons vu un film très drôle.'].sort());
    expect(screen.getByText(/voice may take a moment/)).toBeTruthy();
  });
});

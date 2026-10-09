// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SaveToNotebook } from '../SaveToNotebook';
import { strengthQuotes } from '../../../../domain/learn/notebook/notebook';

afterEach(cleanup);

const IMPROVED = "Samedi, je suis allé au cinéma avec mes amis. Nous avons mangé des pizzas.";
const QUESTION = { questionId: 'q1', question: 'Que fais-tu le week-end ?', topicKey: 'hobbies', subTopic: 'weekends' };
const FEEDBACK = {
  improved_answer: IMPROVED,
  strengths: [
    { quote: 'avec mes amis', why: 'who with' },
    { quote: 'nous avons mangé', why: 'passé composé' },
    { quote: 'une phrase reformulée', why: 'gone from the improved answer' },
  ],
};

function view(props: Partial<Parameters<typeof SaveToNotebook>[0]> = {}) {
  const onSave = vi.fn();
  render(
    <MemoryRouter>
      <SaveToNotebook feedback={FEEDBACK} question={QUESTION} signedIn offered={false} savedAnswer={null} onSave={onSave} {...props} />
    </MemoryRouter>,
  );
  return onSave;
}

describe('SaveToNotebook', () => {
  it('writes nothing until the learner taps Save, then hands over the draft with only the key phrases still in the answer', () => {
    const onSave = view();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('notebook-quiet'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      ...QUESTION,
      answer: IMPROVED,
      phrases: ['avec mes amis', 'nous avons mangé'],
    });
    expect(screen.getByTestId('notebook-saved').textContent).toContain('Saved to your notebook.');
  });

  it('after a Second take or a high score it offers once: "Keep this version for your exam notes?"', () => {
    const onSave = view({ offered: true });
    const offer = screen.getByTestId('notebook-offer');
    expect(offer.textContent).toContain('Keep this version for your exam notes?');
    expect(offer.textContent).toContain('material to adapt, not a script to memorise');
    expect(onSave).not.toHaveBeenCalled();
    // "Not now" puts the offer away for good; the quiet button stays.
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
    expect(screen.getByTestId('notebook-quiet')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('a signed-in learner who saved the same answer sees it as saved, with a link to the notebook', () => {
    view({ offered: true, savedAnswer: `  ${IMPROVED.toUpperCase()} ` });
    expect(screen.getByTestId('notebook-saved')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open notebook' }).getAttribute('href')).toBe('/notebook');
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('a different saved answer offers to replace it and says the old one stays in history', () => {
    const onSave = view({ offered: true, savedAnswer: 'Une autre version.' });
    expect(screen.getByTestId('notebook-offer').textContent).toContain('stays in its history');
    fireEvent.click(screen.getByRole('button', { name: 'Replace saved version' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('a guest can never save: only a sign-in note, and only once the offer would have appeared', () => {
    const onSave = view({ signedIn: false });
    expect(screen.queryByTestId('notebook-guest')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    const onSave2 = view({ signedIn: false, offered: true });
    expect(screen.getByTestId('notebook-guest').textContent).toContain('Sign in to keep your notes.');
    expect(screen.queryByRole('button')).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
    expect(onSave2).not.toHaveBeenCalled();
  });

  it('renders nothing without an improved answer', () => {
    view({ feedback: { improved_answer: '  ', strengths: [] }, offered: true });
    expect(screen.queryByTestId('notebook-offer')).toBeNull();
    expect(screen.queryByTestId('notebook-quiet')).toBeNull();
  });

  it('does not import storage, context, dispatch or analytics', () => {
    const src = readFileSync(join(process.cwd(), 'src/features/feedback/teacher/SaveToNotebook.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/services\/|context\/|dispatch|localStorage|track\(/);
  });
});

describe('strengthQuotes', () => {
  it('uses every strength, else the single best moment', () => {
    expect(strengthQuotes(FEEDBACK)).toEqual(['avec mes amis', 'nous avons mangé', 'une phrase reformulée']);
    expect(strengthQuotes({ best_moment: 'je suis allé' })).toEqual(['je suis allé']);
    expect(strengthQuotes({})).toEqual([]);
  });
});

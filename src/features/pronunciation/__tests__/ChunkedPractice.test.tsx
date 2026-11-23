// @vitest-environment jsdom
//
// Learn's corrected answer is 30–70 words; the Lab practises one sentence at a time.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { LabSentenceResult } from '../LabPractice';

const lab = vi.hoisted(() => ({
  result: null as unknown,
  props: [] as Array<Record<string, unknown>>,
}));
vi.mock('../LabPractice', () => ({
  LabPractice: (props: {
    targetSentence: string;
    position: { index: number; total: number };
    onNextSentence?: () => void;
    onDone: () => void;
    onResult?: (r: unknown) => void;
    doneLabel?: string;
    trackOpen?: boolean;
  }) => {
    lab.props.push(props);
    return (
      <div data-testid="lab-practice">
        <p data-testid="sentence">{props.targetSentence}</p>
        <p>Sentence {props.position.index + 1} of {props.position.total}</p>
        {props.onNextSentence && (
          <button onClick={() => { props.onResult?.(lab.result); props.onNextSentence!(); }}>Next sentence</button>
        )}
        <button onClick={() => { props.onResult?.(lab.result); props.onDone(); }}>{props.doneLabel ?? 'Done'}</button>
      </div>
    );
  },
}));

import { ChunkedPractice } from '../ChunkedPractice';
import { resetLabStoreForTests } from '../labStore';

const ANSWER = "J'habite à Londres. J'aime le football avec mes amis. Le soir, je regarde la télévision.";
const RESULT: LabSentenceResult = { total: 11, firstClear: 7, bestClear: 10, fixedInPractice: 2, takes: 2 };

afterEach(() => {
  cleanup();
  lab.props.length = 0;
  resetLabStoreForTests();
  localStorage.clear();
});

describe('ChunkedPractice', () => {
  it('practises a long answer one sentence at a time, in order', () => {
    lab.result = RESULT;
    render(<ChunkedPractice text={ANSWER} entry="learn_feedback" onDone={vi.fn()} />);
    expect(screen.getByTestId('sentence').textContent).toBe("J'habite à Londres.");
    expect(screen.getByText('Sentence 1 of 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next sentence' }));
    expect(screen.getByTestId('sentence').textContent).toBe("J'aime le football avec mes amis.");
    fireEvent.click(screen.getByRole('button', { name: 'Next sentence' }));
    expect(screen.getByText('Sentence 3 of 3')).toBeTruthy();
    // The last sentence has nothing to move on to.
    expect(screen.queryByRole('button', { name: 'Next sentence' })).toBeNull();
  });

  it('opens the Lab once per answer, not once per sentence', () => {
    lab.result = RESULT;
    render(<ChunkedPractice text={ANSWER} entry="learn_feedback" onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next sentence' }));
    expect(lab.props.map((p) => p.trackOpen)).toEqual([true, false]);
  });

  it('ends with a plain summary of the sitting, then continues', () => {
    lab.result = RESULT;
    const onDone = vi.fn();
    render(<ChunkedPractice text={ANSWER} entry="learn_feedback" onDone={onDone} continueLabel="Next question" doneLabel="Done — next question" />);
    fireEvent.click(screen.getByRole('button', { name: 'Next sentence' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done — next question' }));
    expect(onDone).not.toHaveBeenCalled();

    const summary = screen.getByTestId('lab-summary');
    expect(summary.textContent).toMatch(/Nice work — 2 sentences practised/);
    expect(summary.textContent).toMatch(/Sentence 1: 7 → 10 of 11 words clear/);
    expect(summary.textContent).toMatch(/4 words fixed in practice\./);
    expect(summary.textContent).not.toMatch(/\bwrong\b|%|\/\s?100/);

    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('a single sentence still gets the summary', () => {
    lab.result = { total: 6, firstClear: 6, bestClear: 6, fixedInPractice: 0, takes: 1 };
    const onDone = vi.fn();
    render(<ChunkedPractice text="Les enfants jouent dans le jardin." entry="lab_home" onDone={onDone} />);
    expect(screen.queryByText(/Sentence 1 of/)).toBeTruthy(); // the mock always prints it; the real header hides "1 of 1"
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('lab-summary').textContent).toMatch(/Nice work — 1 sentence practised/);
    expect(screen.getByTestId('lab-summary').textContent).toMatch(/6 of 6 words clear/);
  });

  it('leaves straight away when no take could be checked — nothing to summarise', () => {
    lab.result = null;
    const onDone = vi.fn();
    render(<ChunkedPractice text={ANSWER} entry="learn_feedback" onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('lab-summary')).toBeNull();
  });

  it('says how many tricky words are waiting', () => {
    lab.result = RESULT;
    localStorage.setItem(
      'frenchCoach_pronunciationLab',
      JSON.stringify({
        version: 1,
        observations: [],
        checks: [],
        words: { jardin: { status: 'tricky', practiseCount: 2, clearRun: 0, lastDay: '2020-01-01', lastClearDay: null } },
      }),
    );
    render(<ChunkedPractice text="Les enfants jouent dans le jardin." entry="lab_home" onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('lab-summary').textContent).toMatch(/1 word is on your tricky list/);
  });
});

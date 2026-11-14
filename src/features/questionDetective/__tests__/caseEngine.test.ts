import { describe, expect, it } from 'vitest';
import { DETECTIVE_CASES } from '../../../data/questionWords/cases';
import { askWitness, answerClosing, startCase } from '../caseEngine';

const file = DETECTIVE_CASES[0];

describe('caseEngine', () => {
  it('gives a clue for the right word and a funny reply for the wrong one', () => {
    const witness = file.witnesses[0];
    const wrong = askWitness(file, startCase(), 'quand');
    expect(wrong.lastReply?.kind).toBe('wrong');
    expect(wrong.lastReply?.text).toBe(witness.wrong.quand);
    expect(wrong.clues).toHaveLength(0);

    const right = askWitness(file, startCase(), witness.rightWord);
    expect(right.lastReply?.kind).toBe('clue');
    expect(right.clues).toEqual([witness.clue]);
    expect(right.witnessIndex).toBe(1);
  });

  it('solves the case only when every closing answer is right', () => {
    let state = startCase();
    for (const w of file.witnesses) state = askWitness(file, state, w.rightWord);
    expect(state.phase).toBe('closing');
    state = answerClosing(file, state, 'banane magique');
    expect(state.phase).toBe('closing');
    expect(state.solved).toBe(false);
    state = { ...startCase(), phase: 'closing', clues: file.witnesses.map(w => w.clue) };
    for (const item of file.closing) state = answerClosing(file, state, item.model);
    expect(state.phase).toBe('done');
    expect(state.solved).toBe(true);
  });
});

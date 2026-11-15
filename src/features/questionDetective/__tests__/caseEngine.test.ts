import { describe, expect, it } from 'vitest';
import { DETECTIVE_CASES } from '../../../data/questionWords/cases';
import type { WordId } from '../../../data/questionWords/types';
import {
  AUTO_HINT_AFTER,
  answerClosing,
  askForHint,
  canRetryClosing,
  chooseTool,
  cluesFound,
  currentStep,
  hintVisible,
  nextClosing,
  nextStep,
  startCase,
  stepChoices,
  type CaseState,
} from '../caseEngine';

const file = DETECTIVE_CASES[0];
const late = DETECTIVE_CASES.find(c => c.id === 'late')!;

function solveSteps(state: CaseState, cs = file): CaseState {
  let s = state;
  for (const step of cs.steps) {
    s = nextStep(cs, chooseTool(cs, s, step.rightWord));
  }
  return s;
}

describe('caseEngine: the chain of questions', () => {
  it('offers four tools — the right one and the three authored wrong ones — in a stable order', () => {
    for (const c of DETECTIVE_CASES) {
      for (const step of c.steps) {
        const choices = stepChoices(step);
        expect(choices, `${c.id}/${step.id}`).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices).toContain(step.rightWord);
        expect(stepChoices(step)).toEqual(choices);
      }
    }
  });

  it('does not always put the right tool first', () => {
    const firsts = DETECTIVE_CASES.flatMap(c => c.steps).map(step => stepChoices(step)[0] === step.rightWord);
    expect(firsts.some(f => !f)).toBe(true);
  });

  it('a wrong tool shows the witness’s confused reply and shuts that tool', () => {
    const step = file.steps[0];
    const wrong = Object.keys(step.wrong)[0] as WordId;
    const s = chooseTool(file, startCase(), wrong);
    expect(s.answered).toBe(false);
    expect(s.lastWrong).toEqual({ wordId: wrong, text: step.wrong[wrong] });
    expect(s.tried).toEqual([wrong]);
    // The shut tool does nothing the second time.
    expect(chooseTool(file, s, wrong)).toBe(s);
    expect(s.stepIndex).toBe(0);
  });

  it('the right tool shows the clue but stays on the step until the learner moves on', () => {
    const step = file.steps[0];
    const s = chooseTool(file, startCase(), step.rightWord);
    expect(s.answered).toBe(true);
    expect(s.stepIndex).toBe(0);
    expect(currentStep(file, s)).toBe(step);
    // Further taps do nothing once it is answered.
    expect(chooseTool(file, s, 'quand')).toBe(s);
  });

  it('the clue joins the notes only when the learner moves on, in order', () => {
    let s = chooseTool(file, startCase(), file.steps[0].rightWord);
    expect(cluesFound(file, s)).toHaveLength(0);
    s = nextStep(file, s);
    expect(s.stepIndex).toBe(1);
    expect(s.answered).toBe(false);
    expect(s.tried).toEqual([]);
    expect(cluesFound(file, s).map(c => c.id)).toEqual([file.steps[0].id]);
  });

  it('nextStep does nothing until the clue is found', () => {
    const s = startCase();
    expect(nextStep(file, s)).toBe(s);
  });

  it('shows the hint on request, and by itself after two wrong tools', () => {
    let s = startCase();
    expect(hintVisible(s)).toBe(false);
    expect(hintVisible(askForHint(s))).toBe(true);
    const wrongs = Object.keys(file.steps[0].wrong) as WordId[];
    for (let i = 0; i < AUTO_HINT_AFTER; i++) s = chooseTool(file, s, wrongs[i]);
    expect(hintVisible(s)).toBe(true);
    // A new step starts with no hint.
    s = nextStep(file, chooseTool(file, s, file.steps[0].rightWord));
    expect(hintVisible(s)).toBe(false);
  });

  it('counts a step as first-try only with no wrong tool and no hint', () => {
    let s = chooseTool(file, startCase(), file.steps[0].rightWord);
    expect(s.firstTry).toBe(1);
    s = nextStep(file, s);
    s = chooseTool(file, s, Object.keys(file.steps[1].wrong)[0] as WordId);
    s = chooseTool(file, s, file.steps[1].rightWord);
    expect(s.firstTry).toBe(1);
    s = nextStep(file, s);
    s = chooseTool(file, askForHint(s), file.steps[2].rightWord);
    expect(s.firstTry).toBe(1);
  });

  it('goes to the report after the last clue', () => {
    const s = solveSteps(startCase());
    expect(s.phase).toBe('closing');
    expect(cluesFound(file, s)).toHaveLength(file.steps.length);
  });

  it('plays the late-class case in the order the learner expects: why, how long, how', () => {
    expect(late.steps.map(s => s.rightWord)).toEqual(['pourquoi', 'combien', 'comment']);
    expect(late.steps[1].goal).toMatch(/how long/i);
  });
});

describe('caseEngine: the report', () => {
  const reportState = (): CaseState => solveSteps(startCase());

  it('settles a right answer and waits for Next', () => {
    const s = answerClosing(file, reportState(), file.closing[0].model);
    expect(s.closingSettled).toBe(true);
    expect(s.closingRight).toBe(1);
    expect(s.phase).toBe('closing');
    expect(nextClosing(file, s).closingIndex).toBe(1);
  });

  it('gives a second try after a first miss, then shows the answer', () => {
    let s = answerClosing(file, reportState(), 'banane magique');
    expect(s.closingSettled).toBe(false);
    expect(canRetryClosing(s)).toBe(true);
    s = answerClosing(file, s, 'encore faux');
    expect(s.closingSettled).toBe(true);
    expect(s.closingRight).toBe(0);
    expect(canRetryClosing(s)).toBe(false);
  });

  it('counts a right answer on the retry', () => {
    let s = answerClosing(file, reportState(), 'banane magique');
    s = answerClosing(file, s, file.closing[0].model);
    expect(s.closingSettled).toBe(true);
    expect(s.closingRight).toBe(1);
  });

  it('closes the case only when every report answer is right', () => {
    let s = reportState();
    for (const item of file.closing) s = nextClosing(file, answerClosing(file, s, item.model));
    expect(s.phase).toBe('done');
    expect(s.solved).toBe(true);

    let miss = reportState();
    miss = nextClosing(file, answerClosing(file, answerClosing(file, miss, 'x'), 'y'));
    for (const item of file.closing.slice(1)) miss = nextClosing(file, answerClosing(file, miss, item.model));
    expect(miss.phase).toBe('done');
    expect(miss.solved).toBe(false);
  });

  it('nextClosing waits until the answer is settled', () => {
    const s = reportState();
    expect(nextClosing(file, s)).toBe(s);
  });
});

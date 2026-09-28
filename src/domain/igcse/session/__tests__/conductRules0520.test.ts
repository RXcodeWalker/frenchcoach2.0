/**
 * Cambridge 0520/03 conduct rules — reproduction + characterization tests.
 *
 * One `describe` per rule in docs/systems/exam-conduct-0520.md (cited as
 * "exam-conduct §N"). Each drives the real reducer (`step()`) over the real
 * bundled fixtures (OFFLINE_FIXTURES via the adapter), with an explicit wall
 * clock, so a test reads as "a candidate who answered like this, this long,
 * hears this from the examiner".
 *
 * Tests marked "characterization" pin behaviour that already follows the
 * notes; the rest reproduce a bug from the 0520 conduct plan (§3, Bugs 1-4).
 */

import { describe, expect, it } from 'vitest';
import { initConductEngineState, startConduct, step, computeRelevance, AUTHORIZED_EXTENSION_PROMPTS } from '../conductEngine';
import { classifyUtteranceIntent } from '../utteranceIntents';
import { OFFLINE_FIXTURES } from '../../../../data/exam/bank/fixtures';
import { toSessionQuestionSet } from '../../../../data/exam/bank/adapter';
import type { CandidateTurnResult, ConductEngineState, ExaminerAction, SessionQuestionSet } from '../types';
import type { SessionPart } from '../../stt/types';

type Mode = 'examSim' | 'coached';

const SET_001 = toSessionQuestionSet(OFFLINE_FIXTURES['original-practice-001']);
const SET_002 = toSessionQuestionSet(OFFLINE_FIXTURES['original-practice-002']);

/** SET_001 with t1q3's alternative given a second part — the D9 shape (alternativeTexts = the alternative's ordered parts). */
const SET_001_TWO_PART_ALT: SessionQuestionSet = {
  ...SET_001,
  questions: SET_001.questions.map((q) =>
    q.questionId === 't1q3' ? { ...q, alternativeTexts: [q.alternativeTexts[0], 'Et avec qui ?'] } : q,
  ),
};

function question(set: SessionQuestionSet, questionId: string) {
  const q = set.questions.find((x) => x.questionId === questionId);
  if (!q) throw new Error(`no ${questionId}`);
  return q;
}

/** A candidate turn built exactly the way SimulationSession.submitTurn builds one (intent → didRespond/relevance). */
function said(
  transcript: string,
  responseDurationS: number,
  part: SessionPart,
  extra: Partial<CandidateTurnResult> = {},
): CandidateTurnResult {
  const intent = extra.requestedRepeat ? 'repeat_request' : classifyUtteranceIntent(transcript);
  const wordCount = transcript.trim().length === 0 ? 0 : transcript.trim().split(/\s+/).length;
  const didRespond = intent === 'dont_know' ? true : intent === 'answer' ? transcript.trim().length > 0 : false;
  const result: CandidateTurnResult = {
    didRespond,
    relevant: false,
    transcript,
    wordCount,
    responseDurationS,
    requestedRepeat: Boolean(extra.requestedRepeat) || intent === 'repeat_request',
    ...extra,
  };
  result.relevant = intent === 'answer' ? computeRelevance(result, part) : false;
  return result;
}

const FILLER_WORDS = 'je vais souvent au parc avec mes amis et nous jouons au football puis nous mangeons une glace'.split(' ');

/** An n-word French answer (n may exceed the filler list — it cycles). */
function nWords(n: number): string {
  return Array.from({ length: n }, (_, i) => FILLER_WORDS[i % FILLER_WORDS.length]).join(' ');
}

/**
 * Drives one exam. `clockS` is the session wall clock (SimulationSession.getClockS):
 * each turn advances it by `gapS` (examiner speech + thinking + the answer itself).
 */
class Exam {
  state: ConductEngineState;
  clockS = 0;
  readonly log: ExaminerAction[] = [];

  constructor(
    readonly set: SessionQuestionSet,
    mode: Mode = 'examSim',
  ) {
    // Pre-v4 engines take one argument; the extra policy argument is ignored there.
    this.state = (initConductEngineState as (s: SessionQuestionSet, p: { mode: Mode }) => ConductEngineState)(set, { mode });
    const started = startConduct(set, this.state);
    this.state = started.state;
    this.log.push(...started.actions);
  }

  get part(): SessionPart {
    const phase = this.state.phase as { kind: string; part?: SessionPart };
    return phase.kind === 'rolePlay' ? 'rolePlay' : (phase.part ?? 'topic2');
  }

  get current(): ExaminerAction {
    return this.log[this.log.length - 1];
  }

  /** One candidate turn; returns the actions it produced. */
  turn(result: CandidateTurnResult, gapS: number = Math.max(result.responseDurationS, 1)): ExaminerAction[] {
    this.clockS += gapS;
    const r = step(this.set, this.state, { kind: 'candidateTurn', result, clockS: this.clockS } as Parameters<typeof step>[2]);
    this.state = r.state;
    this.log.push(...r.actions);
    return r.actions;
  }

  answer(words: number, durationS: number, gapS?: number): ExaminerAction[] {
    return this.turn(said(nWords(words), durationS, this.part), gapS);
  }

  silence(gapS = 10): ExaminerAction[] {
    return this.turn(said('', 0, this.part), gapS);
  }

  askRepeat(gapS = 3): ExaminerAction[] {
    return this.turn(said('', 0.1, this.part, { requestedRepeat: true }), gapS);
  }

  skip(gapS = 10): ExaminerAction[] {
    return this.turn(said('', 0, this.part, { skipConfirmed: true }), gapS);
  }

  /** Answers every role-play prompt with a short transactional answer until topic 1 starts. */
  clearRolePlay(gapS = 10): this {
    let guard = 0;
    while (this.part === 'rolePlay' && guard++ < 20) this.turn(said('Oui, un billet pour Paris.', 3, 'rolePlay'), gapS);
    expect(this.current).toMatchObject({ kind: 'READ_MAIN', part: 'topic1', questionId: 't1q1' });
    return this;
  }

  /** Answers the current topic prompt (and a second part, if asked) with a developed answer until `questionId` is being asked. */
  answerUntil(questionId: string, gapS = 30): this {
    let guard = 0;
    while (!(this.current.kind === 'READ_MAIN' && this.current.questionId === questionId) && guard++ < 30) {
      this.answer(20, 20, gapS);
    }
    expect(this.current).toMatchObject({ kind: 'READ_MAIN', questionId });
    return this;
  }

  since(index: number): ExaminerAction[] {
    return this.log.slice(index);
  }
}

function kinds(actions: ExaminerAction[]): string[] {
  return actions.map((a) => a.kind);
}

function furtherQuestions(actions: ExaminerAction[], part: 'topic1' | 'topic2'): ExaminerAction[] {
  return actions.filter((a) => a.kind === 'FURTHER_QUESTION' && a.part === part);
}

// ── exam-conduct §7/§8: role play (Bug 1) ────────────────────────────────────

describe('exam-conduct §7-§8 — role play prompt count (Bug 1, characterization)', () => {
  it('all five tasks answered: the examiner speaks 6 scripted prompts (rp3 is two-part), every one belonging to rp1-rp5', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const rolePlayPrompts = exam.log.filter((a) => a.part === 'rolePlay' && a.questionId !== null);
    expect(rolePlayPrompts).toHaveLength(6);
    for (const a of rolePlayPrompts) expect(['rp1', 'rp2', 'rp3', 'rp4', 'rp5']).toContain(a.questionId);
  });

  it('exam-conduct §9 (D13): an in-role TRANSITION separates each answered task, but never crosses into topic 1', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const rolePlayTransitions = exam.log.filter((a) => a.part === 'rolePlay' && a.kind === 'TRANSITION');
    // 5 tasks answered in order → 4 boundaries (1-2, 2-3, 3-4, 4-5), none after rp5.
    expect(rolePlayTransitions).toHaveLength(4);
    expect(exam.log[exam.log.length - 1]).toMatchObject({ kind: 'READ_MAIN', part: 'topic1', questionId: 't1q1' });
  });

  it('one "je ne sais pas" adds one verbatim repeat — 7 scripted prompts, still only rp1-rp5', () => {
    const exam = new Exam(SET_001);
    exam.turn(said('Je voudrais aller à Paris.', 3, 'rolePlay'));
    exam.turn(said('Je ne sais pas.', 2, 'rolePlay'));
    expect(exam.current).toMatchObject({ kind: 'REPEAT', questionId: 'rp2', text: question(SET_001, 'rp2').mainText });
    exam.clearRolePlay();
    const rolePlayPrompts = exam.log.filter((a) => a.part === 'rolePlay' && a.questionId !== null);
    expect(rolePlayPrompts).toHaveLength(7);
    for (const a of rolePlayPrompts) expect(['rp1', 'rp2', 'rp3', 'rp4', 'rp5']).toContain(a.questionId);
  });

  it('exam-conduct §18/§9 (D13): a failed repeat that advances to the next task gets no TRANSITION', () => {
    const exam = new Exam(SET_001);
    exam.turn(said('Je voudrais aller à Paris.', 3, 'rolePlay')); // rp1 answered
    exam.turn(said('', 0, 'rolePlay')); // rp2: silence → repeat
    const afterFailedRepeat = exam.turn(said('', 0, 'rolePlay')); // rp2: still silent → advance, no ack
    expect(kinds(afterFailedRepeat)).toEqual(['READ_MAIN']);
    expect(afterFailedRepeat[0]).toMatchObject({ questionId: 'rp3' });
  });
});

// ── exam-conduct §7: two-part questions always ask part 2 (Bug 4a) ───────────

describe('exam-conduct §7 — the second part is always asked (Bug 4a, characterization, D2)', () => {
  for (const mode of ['examSim', 'coached'] as const) {
    it(`${mode}: a part-1 answer that already gives a reason still gets the scripted second part`, () => {
      const exam = new Exam(SET_001, mode).clearRolePlay().answerUntil('t1q4');
      const actions = exam.turn(said("J'aime beaucoup le sport parce que c'est bon pour la santé et je me sens bien.", 12, 'topic1'));
      expect(actions).toEqual([
        expect.objectContaining({ kind: 'READ_MAIN', questionId: 't1q4', text: question(SET_001, 't1q4').secondPartText }),
      ]);
    });
  }
});

// ── exam-conduct §12: Q1-Q2 ladder is repeat → next question (Bug 2) ────────

describe('exam-conduct §12 — Q1-Q2: repeat, then the next question; never an alternative (Bug 2)', () => {
  for (const mode of ['examSim', 'coached'] as const) {
    it(`${mode}: 002 t1q2 (which carries an alternative) unanswered twice moves on to t1q3`, () => {
      expect(question(SET_002, 't1q2').alternativeTexts.length).toBeGreaterThan(0);
      const exam = new Exam(SET_002, mode).clearRolePlay().answerUntil('t1q2');
      expect(exam.silence()).toEqual([expect.objectContaining({ kind: 'REPEAT', questionId: 't1q2' })]);
      const after = exam.silence();
      expect(kinds(after)).not.toContain('READ_ALTERNATIVE');
      expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q3' });
    });
  }
});

// ── exam-conduct §13: Q3-Q5 ladder, alternative question(s) (D9) ─────────────

describe('exam-conduct §13 — Q3-Q5: repeat, alternative question (all its parts, one repeat), next question', () => {
  it('characterization: t1q3 unanswered twice gets its alternative, then one repeat of it, then the next question', () => {
    const exam = new Exam(SET_001).clearRolePlay().answerUntil('t1q3');
    exam.silence();
    expect(exam.silence()).toEqual([
      expect.objectContaining({ kind: 'READ_ALTERNATIVE', questionId: 't1q3', text: question(SET_001, 't1q3').alternativeTexts[0] }),
    ]);
    expect(exam.silence()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', questionId: 't1q3', variant: 'alternative' }),
    ]);
    const after = exam.silence();
    expect(kinds(after)).toEqual(['READ_MAIN']);
    expect(exam.current).toMatchObject({ questionId: 't1q4' });
  });

  it('D9: an alternative with two parts asks its second part after the first is answered, then moves on', () => {
    const exam = new Exam(SET_001_TWO_PART_ALT).clearRolePlay().answerUntil('t1q3');
    exam.silence();
    exam.silence(); // → alternative part 1
    const afterAltPart1 = exam.answer(20, 20);
    expect(afterAltPart1).toEqual([
      expect.objectContaining({ kind: 'READ_ALTERNATIVE', questionId: 't1q3', variant: 'alternative', text: 'Et avec qui ?' }),
    ]);
    exam.answer(20, 20);
    expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q4' });
  });

  it('D9: an unanswered alternative second part is repeated once, verbatim, then the next question', () => {
    const exam = new Exam(SET_001_TWO_PART_ALT).clearRolePlay().answerUntil('t1q3');
    exam.silence();
    exam.silence();
    exam.answer(20, 20); // → alternative part 2
    expect(exam.silence()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', questionId: 't1q3', variant: 'alternative', text: 'Et avec qui ?' }),
    ]);
    expect(kinds(exam.silence())).toEqual(['READ_MAIN']);
    expect(exam.current).toMatchObject({ questionId: 't1q4' });
  });
});

// ── exam-conduct §11: further questions never inherit Q5's state (Bug 2) ─────

describe('exam-conduct §11 — a further question has its own state (Bug 2, Q5 sub-state bleed)', () => {
  it('after a skipped Q5 alternative, silence on the further question repeats the further question, not the Q5 alternative', () => {
    const exam = new Exam(SET_001).clearRolePlay().answerUntil('t1q5', 20);
    exam.silence(5); // repeat Q5
    expect(exam.silence(5)).toEqual([expect.objectContaining({ kind: 'READ_ALTERNATIVE', questionId: 't1q5' })]);
    const furtherAsked = exam.skip(5);
    expect(furtherAsked).toEqual([expect.objectContaining({ kind: 'FURTHER_QUESTION', part: 'topic1' })]);
    const furtherText = furtherAsked[0].text;

    const onSilence = exam.silence(5);
    expect(onSilence).toEqual([
      expect.objectContaining({ kind: 'REPEAT', part: 'topic1', questionId: null, text: furtherText }),
    ]);
    expect(onSilence[0].text).not.toBe(question(SET_001, 't1q5').alternativeTexts[0]);
  });
});

// ── exam-conduct §14: extension prompts, judged on the whole answer (Bug 3b) ──

describe('exam-conduct §14 — extension prompts are judged on the whole answer to the question (Bug 3b)', () => {
  it('a 40-word first part followed by a short second part draws no extension prompt', () => {
    const exam = new Exam(SET_001).clearRolePlay().answerUntil('t1q4');
    exam.answer(40, 25); // part 1 → part 2 asked
    expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q4', text: question(SET_001, 't1q4').secondPartText });
    const afterPart2 = exam.turn(said("Parce que c'est cool.", 3, 'topic1'));
    expect(kinds(afterPart2)).not.toContain('EXTENSION_PROMPT');
    expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q5' });
  });

  it('characterization: two brief parts (3 + 3 words) still draw an extension prompt', () => {
    const exam = new Exam(SET_001).clearRolePlay().answerUntil('t1q4');
    exam.answer(3, 3);
    const afterPart2 = exam.answer(3, 3);
    expect(afterPart2).toEqual([expect.objectContaining({ kind: 'EXTENSION_PROMPT', questionId: 't1q4' })]);
  });

  it('a Repeat request on an extension prompt repeats it verbatim instead of moving on', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const extension = exam.answer(3, 3);
    expect(extension).toEqual([expect.objectContaining({ kind: 'EXTENSION_PROMPT', questionId: 't1q1' })]);
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', questionId: 't1q1', text: extension[0].text, trigger: 'repeat_requested' }),
    ]);
    expect(AUTHORIZED_EXTENSION_PROMPTS).toContain(exam.current.text);
  });
});

// ── exam-conduct §18: acknowledge answers, never a failure ────────────────────

describe('exam-conduct §18 — no acknowledgement after an unanswered extension or further question', () => {
  it('an extension prompt the candidate skips moves on without a TRANSITION', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    expect(kinds(exam.answer(3, 3))).toEqual(['EXTENSION_PROMPT']);
    const after = exam.skip();
    expect(kinds(after)).toEqual(['READ_MAIN']);
    expect(exam.current).toMatchObject({ questionId: 't1q2' });
  });

  it('a further question the candidate skips moves on without a TRANSITION', () => {
    const exam = new Exam(SET_001).clearRolePlay().answerUntil('t1q5', 20);
    const first = exam.answer(20, 20, 20);
    expect(kinds(first)).toEqual(['TRANSITION', 'FURTHER_QUESTION']);
    const after = exam.skip(5);
    expect(kinds(after)).toEqual(['FURTHER_QUESTION']);
  });
});

// ── exam-conduct §15/§16: further questions, 3½-min wall-clock rule (Bug 2/3a/4b) ──

describe('exam-conduct §15-§16 — further questions only when the conversation lasts ≤3½ min, measured on the clock (Bug 2)', () => {
  it('five developed answers (30 words, 25 s each) in a conversation lasting 4:10 get no further question', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const from = exam.log.length;
    // 001 topic 1 = 5 questions, t1q4 two-part → 6 answers; 250 s of conversation in total.
    for (let i = 0; i < 6; i++) exam.answer(30, 25, 250 / 6);
    expect(furtherQuestions(exam.since(from), 'topic1')).toHaveLength(0);
    expect(exam.part).toBe('topic2');
  });

  it('typed answers (0 s of mic time) in a conversation lasting 4:10 get no further question', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const from = exam.log.length;
    for (let i = 0; i < 6; i++) {
      exam.turn(said(nWords(30), 0, 'topic1', { inputMode: 'text' }), 250 / 6);
    }
    expect(furtherQuestions(exam.since(from), 'topic1')).toHaveLength(0);
    expect(exam.part).toBe('topic2');
  });

  it('a short conversation gets the authored further questions — never a callback quoting the candidate (Bug 3a, 4b)', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const from = exam.log.length;
    // Six developed answers, 20 s apart: 2:00 of conversation after Q5.
    for (let i = 0; i < 6; i++) exam.turn(said("J'aime jouer au tennis avec mon frère parce que c'est vraiment amusant le week-end.", 15, 'topic1'), 20);
    exam.turn(said("J'aime le sport parce que c'est amusant et je retrouve mes amis au club.", 15, 'topic1'), 20);
    const asked = furtherQuestions(exam.since(from), 'topic1');
    expect(asked.map((a) => a.text)).toEqual(SET_001.furtherQuestions.topic1);
    for (const a of asked) {
      expect(a.trigger).toBe('below_min_duration');
      expect(a.text).not.toMatch(/Peux-tu développer|Pourquoi \?/);
    }
  });

  it('the 3½-min check is re-made after each further question: none is asked once the conversation passes 3½ min', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const from = exam.log.length;
    for (let i = 0; i < 6; i++) exam.answer(20, 20, 30); // 3:00 after Q5
    expect(furtherQuestions(exam.since(from), 'topic1')).toHaveLength(1);
    exam.answer(20, 20, 45); // 3:45 — past the floor
    expect(furtherQuestions(exam.since(from), 'topic1')).toHaveLength(1);
    expect(exam.part).toBe('topic2');
  });

  it('a conversation at exactly 3½ min still gets a further question ("3½ minutes or less")', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const from = exam.log.length;
    for (let i = 0; i < 6; i++) exam.answer(20, 20, 35); // exactly 210 s
    expect(furtherQuestions(exam.since(from), 'topic1')).toHaveLength(1);
  });

  it('the Repeat button on a further question repeats it verbatim', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    for (let i = 0; i < 6; i++) exam.answer(20, 20, 20);
    expect(exam.current).toMatchObject({ kind: 'FURTHER_QUESTION' });
    const text = exam.current.text;
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', questionId: null, part: 'topic1', text, trigger: 'repeat_requested' }),
    ]);
  });

  it('coached (D5, Batch 3): always asks both authored further questions, not time-gated', () => {
    // 250 s of conversation — well past the 3½-min floor that would suppress
    // further questions in Exam Sim. Coached asks them anyway (D5): they exist
    // to give the candidate practice, not to fill dead air.
    const exam = new Exam(SET_001, 'coached').clearRolePlay();
    const from = exam.log.length;
    for (let i = 0; i < 6; i++) {
      exam.turn(said("J'aime jouer au tennis avec mon frère parce que c'est vraiment amusant le week-end.", 15, 'topic1'), 250 / 6);
    }
    exam.turn(said("J'aime le sport parce que c'est amusant et je retrouve mes amis au club.", 15, 'topic1'), 20); // answers further1
    exam.turn(said("Oui, je regarde aussi le foot à la télé avec ma famille le dimanche.", 15, 'topic1'), 20); // answers further2
    const asked = furtherQuestions(exam.since(from), 'topic1');
    expect(asked.map((a) => a.text)).toEqual(SET_001.furtherQuestions.topic1);
    expect(exam.part).toBe('topic2');
  });
});

// ── exam-conduct §17: extension suppression past 4 min is wall-clock (Exam Sim only) ──

describe('exam-conduct §17 — past 4 min of conversation, no more extension prompts (Exam Sim only)', () => {
  it('examSim: a brief answer after 4:05 of conversation (little of it mic time) draws no extension prompt', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    const actions = exam.answer(3, 5, 245);
    expect(kinds(actions)).not.toContain('EXTENSION_PROMPT');
  });

  it('coached: no time rules — the same brief answer still draws an extension prompt', () => {
    const exam = new Exam(SET_001, 'coached').clearRolePlay();
    const actions = exam.answer(3, 5, 245);
    expect(kinds(actions)).toEqual(['EXTENSION_PROMPT']);
  });
});

// ── Audit #15 (Batch 3): a Repeat request re-reads the part currently awaiting
// an answer, never the wrong part. Extension-prompt and further-question
// repeats are already covered above (exam-conduct §14/§15); this block is the
// rest of the checklist: role-play part 1, role-play part 2, a topic main
// question, a topic second part, and each part of an alternative (D9). Role
// play's own part-2 repeat was already fixed in session-engine-v3
// (`conductEngine.ts`'s `secondPartPending` branch); the rest are
// characterizations of session-engine-v4 behaviour, confirmed here rather
// than newly fixed — see verification-log.md's Batch 3 entry. ──────────────

describe('audit #15 — Repeat re-reads the currently-awaited part, not the wrong one', () => {
  it('role play, part 1 (rp1 has no second part): Repeat re-reads rp1.mainText', () => {
    const exam = new Exam(SET_001);
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', part: 'rolePlay', questionId: 'rp1', text: question(SET_001, 'rp1').mainText }),
    ]);
  });

  it('role play, part 2 (rp3 is two-part): Repeat re-reads rp3.secondPartText, never mainText', () => {
    const exam = new Exam(SET_001);
    exam.turn(said('Oui, un billet pour Paris.', 3, 'rolePlay')); // rp1
    exam.turn(said('Oui, un aller simple.', 3, 'rolePlay')); // rp2
    exam.turn(said('Un aller-retour, s\'il vous plaît.', 3, 'rolePlay')); // rp3 part 1 -> reads part 2
    expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp3', text: question(SET_001, 'rp3').secondPartText });
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', part: 'rolePlay', questionId: 'rp3', text: question(SET_001, 'rp3').secondPartText }),
    ]);
  });

  it('topic main question: Repeat re-reads t1q1.mainText', () => {
    const exam = new Exam(SET_001).clearRolePlay();
    expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q1' });
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', part: 'topic1', questionId: 't1q1', text: question(SET_001, 't1q1').mainText }),
    ]);
  });

  it('topic second part (t1q4 is two-part): Repeat re-reads t1q4.secondPartText, never mainText', () => {
    const exam = new Exam(SET_001).clearRolePlay().answerUntil('t1q4');
    exam.answer(20, 20); // t1q4 main answered -> reads secondPartText
    expect(exam.current).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q4', text: question(SET_001, 't1q4').secondPartText });
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', part: 'topic1', questionId: 't1q4', text: question(SET_001, 't1q4').secondPartText }),
    ]);
  });

  it('D9 — alternative part 1: Repeat re-reads alternativeTexts[0]', () => {
    const exam = new Exam(SET_001_TWO_PART_ALT).clearRolePlay().answerUntil('t1q3');
    exam.silence(); // repeat of main
    exam.silence(); // -> alternative part 1 (index 0)
    expect(exam.current).toMatchObject({ kind: 'READ_ALTERNATIVE', questionId: 't1q3', text: question(SET_001_TWO_PART_ALT, 't1q3').alternativeTexts[0] });
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', questionId: 't1q3', variant: 'alternative', text: question(SET_001_TWO_PART_ALT, 't1q3').alternativeTexts[0] }),
    ]);
  });

  it('D9 — alternative part 2: Repeat re-reads alternativeTexts[1], never part 1', () => {
    const exam = new Exam(SET_001_TWO_PART_ALT).clearRolePlay().answerUntil('t1q3');
    exam.silence();
    exam.silence(); // -> alternative part 1
    exam.answer(20, 20); // answers part 1 -> alternative part 2
    expect(exam.current).toMatchObject({ kind: 'READ_ALTERNATIVE', questionId: 't1q3', text: 'Et avec qui ?' });
    expect(exam.askRepeat()).toEqual([
      expect.objectContaining({ kind: 'REPEAT', questionId: 't1q3', variant: 'alternative', text: 'Et avec qui ?' }),
    ]);
  });
});

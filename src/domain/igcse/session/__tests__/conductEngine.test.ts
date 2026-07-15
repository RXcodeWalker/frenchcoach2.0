import { describe, expect, it } from 'vitest';
import {
  initConductEngineState,
  startConduct,
  step,
  decideExtension,
  AUTHORIZED_EXTENSION_PROMPTS,
  MAX_FURTHER_QUESTIONS_PER_TOPIC,
  MAX_EXTENSIONS_PER_TOPIC,
  TOPIC_SPEAKING_FLOOR_S,
  TOPIC_TARGET_S,
  TRANSITION_MARKERS,
} from '../conductEngine';
import { ORIGINAL_QUESTION_SET_1 } from '../../../../data/exam/originalQuestionSets';
import type { CandidateTurnResult, ConductEngineState, ExaminerAction, SessionQuestionSet } from '../types';

const qs = ORIGINAL_QUESTION_SET_1;

function answer(overrides: Partial<CandidateTurnResult> = {}): CandidateTurnResult {
  return {
    didRespond: true,
    relevant: true,
    transcript: 'Je fais mes devoirs et je range ma chambre.',
    wordCount: 8,
    responseDurationS: 10,
    requestedRepeat: false,
    ...overrides,
  };
}

function noResponse(): CandidateTurnResult {
  return {
    didRespond: false,
    relevant: false,
    transcript: '',
    wordCount: 0,
    responseDurationS: 0,
    requestedRepeat: false,
  };
}

/**
 * Drives one step and returns every action the reducer emitted (F2/C6: a step
 * can now emit multiple actions, e.g. [TRANSITION, READ_MAIN] on a successful
 * topic answer). `action` is a convenience alias for the LAST action — what the
 * runtime driver (simulationSession.ts) settles on as "current" — for call
 * sites that only care about the terminal action, not the full sequence.
 */
function driveStep(
  qsSet: SessionQuestionSet,
  state: ConductEngineState,
  result: CandidateTurnResult,
): { state: ConductEngineState; actions: ExaminerAction[]; action: ExaminerAction } {
  const stepResult = step(qsSet, state, { kind: 'candidateTurn', result });
  return { state: stepResult.state, actions: stepResult.actions, action: stepResult.actions[stepResult.actions.length - 1] };
}

/** Drives one step and asserts it emitted exactly one action (pre-C6 single-action paths: role play, repeats, alternatives). */
function driveOne(
  qsSet: SessionQuestionSet,
  state: ConductEngineState,
  result: CandidateTurnResult,
): { state: ConductEngineState; action: ExaminerAction } {
  const { state: nextState, actions, action } = driveStep(qsSet, state, result);
  expect(actions.length).toBe(1);
  return { state: nextState, action };
}

describe('conductEngine: role play', () => {
  it('reads main prompts in authored order and advances on a relevant answer', () => {
    let state = initConductEngineState(qs);
    const first = startConduct(qs, state);
    state = first.state;
    expect(first.actions[0]).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp1', part: 'rolePlay' });

    const next = driveOne(qs, state, answer());
    state = next.state;
    expect(next.action).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp2', part: 'rolePlay' });
  });

  it('repeats verbatim (never rephrases) on no response, then advances after the repeat also fails', () => {
    let state = initConductEngineState(qs);
    state = startConduct(qs, state).state;

    const repeat = driveOne(qs, state, noResponse());
    state = repeat.state;
    expect(repeat.action).toMatchObject({ kind: 'REPEAT', questionId: 'rp1', text: qs.questions[0].mainText, trigger: 'no_response' });

    const afterFailedRepeat = driveOne(qs, state, noResponse());
    state = afterFailedRepeat.state;
    expect(afterFailedRepeat.action).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp2' });
  });

  it('never emits an extension_prompt action during role play', () => {
    let state = initConductEngineState(qs);
    state = startConduct(qs, state).state;
    for (let i = 0; i < 5; i++) {
      const r = driveOne(qs, state, answer());
      state = r.state;
      expect(r.action.kind).not.toBe('EXTENSION_PROMPT');
      expect(r.action.kind).not.toBe('FURTHER_QUESTION');
    }
  });

  it('tracks partsAddressed for a PAUSE (two-part) task and reads part 2 before advancing', () => {
    let state = initConductEngineState(qs);
    state = startConduct(qs, state).state;
    // rp1, rp2 answered normally
    state = driveOne(qs, state, answer()).state;
    state = driveOne(qs, state, answer()).state;

    // rp3 is partsExpected: 2 — first answer should deliver the DISTINCT part-2
    // prompt (rp3.secondPartText), not advance to rp4 and not re-read mainText.
    const part2 = driveOne(qs, state, answer());
    state = part2.state;
    expect(part2.action).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp3', text: qs.questions[2].secondPartText });
    expect(part2.action.text).not.toBe(qs.questions[2].mainText);
    expect(state.rolePlayTasks[2].partsAddressed).toBe(1);

    const afterPart2 = driveOne(qs, state, answer());
    state = afterPart2.state;
    expect(afterPart2.action).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp4' });
    expect(state.rolePlayTasks[2].partsAddressed).toBe(2);
  });
});

describe('decideExtension (C1: authorized, original extension prompts)', () => {
  it('returns null (skip extension) when the answer is developed by word count', () => {
    const result = decideExtension({ wordCount: 12, responseDurationS: 5 }, null);
    expect(result).toBeNull();
  });

  it('returns null (skip extension) when the answer is developed by duration, even with a thin word count', () => {
    const result = decideExtension({ wordCount: 9, responseDurationS: 22 }, null);
    expect(result).toBeNull();
  });

  it('returns exactly one of the two authorized prompts for a thin answer', () => {
    const result = decideExtension({ wordCount: 4, responseDurationS: 5 }, null);
    expect(result).not.toBeNull();
    expect(AUTHORIZED_EXTENSION_PROMPTS).toContain(result?.text);
  });

  it('contains no "vous" register in the authorized extension prompts', () => {
    for (const prompt of AUTHORIZED_EXTENSION_PROMPTS) {
      expect(prompt.toLowerCase()).not.toMatch(/\bvous\b/);
    }
  });

  it('alternates deterministically by index, starting at index 0 with lastIndex=null', () => {
    const first = decideExtension({ wordCount: 4, responseDurationS: 5 }, null);
    expect(first).toMatchObject({ index: 0, text: AUTHORIZED_EXTENSION_PROMPTS[0] });
  });

  it('picks index 1 when lastIndex was 0', () => {
    const result = decideExtension({ wordCount: 4, responseDurationS: 5 }, 0);
    expect(result).toMatchObject({ index: 1, text: AUTHORIZED_EXTENSION_PROMPTS[1] });
  });

  it('picks index 0 when lastIndex was 1', () => {
    const result = decideExtension({ wordCount: 4, responseDurationS: 5 }, 1);
    expect(result).toMatchObject({ index: 0, text: AUTHORIZED_EXTENSION_PROMPTS[0] });
  });
});

describe('conductEngine: topic conversation', () => {
  function toTopic1(): ConductEngineState {
    let state = initConductEngineState(qs);
    state = startConduct(qs, state).state;
    for (let i = 0; i < 6; i++) {
      // 5 role play tasks, rp3 needs 2 answers
      state = driveOne(qs, state, answer()).state;
    }
    return state;
  }

  it('offers an alternative only for questions with alternativeTexts (data-driven, not positional), after a failed repeat', () => {
    let state = toTopic1();
    // t1q1 has no alternatives -> fails main + repeat -> advances to t1q2 (no alternative offered)
    state = driveOne(qs, state, noResponse()).state; // repeat
    const afterFailedRepeatQ1 = driveOne(qs, state, noResponse());
    state = afterFailedRepeatQ1.state;
    expect(afterFailedRepeatQ1.action.kind).not.toBe('READ_ALTERNATIVE');
  });

  it('offers alternative on t1q3 (has alternativeTexts) only after main question fails its one repeat', () => {
    let state = toTopic1();
    // advance through t1q1 (extension after answer) and t1q2
    state = driveOne(qs, state, answer()).state; // extension prompt for q1
    state = driveStep(qs, state, answer()).state; // advance to q2 (+ TRANSITION)
    state = driveOne(qs, state, answer()).state; // extension prompt for q2
    state = driveStep(qs, state, answer()).state; // advance to q3 (+ TRANSITION)

    // q3 fails main + repeat -> alternative should be offered
    state = driveOne(qs, state, noResponse()).state; // repeat
    const alt = driveOne(qs, state, noResponse());
    expect(alt.action).toMatchObject({ kind: 'READ_ALTERNATIVE', questionId: 't1q3', variant: 'alternative' });
  });

  it('caps further-questions at 2 per topic when the 4-min floor is not met', () => {
    let state = toTopic1();
    // Answer all 5 topic1 questions with short, thin answers (below floor, below developed threshold).
    // Each answer may or may not draw an extension (capped at MAX_EXTENSIONS_PER_TOPIC); drive until advanced.
    for (let i = 0; i < 5; i++) {
      let r = driveStep(qs, state, answer({ responseDurationS: 5 }));
      state = r.state;
      if (r.action.kind === 'EXTENSION_PROMPT') {
        r = driveStep(qs, state, answer({ responseDurationS: 5 }));
        state = r.state;
      }
    }

    // Now should be in further-question territory (speakingS well under 3.5 min floor)
    expect(state.topicSpeakingS.topic1).toBeLessThan(TOPIC_SPEAKING_FLOOR_S);

    const furtherTexts: (string | null)[] = [];
    let guard = 0;
    while (state.furtherAskedCount.topic1 < MAX_FURTHER_QUESTIONS_PER_TOPIC + 1 && guard < 10) {
      guard += 1;
      const r = driveStep(qs, state, answer({ responseDurationS: 5 }));
      state = r.state;
      if (r.action.kind === 'FURTHER_QUESTION') furtherTexts.push(r.action.text);
      if (state.phase.kind === 'topic' && state.phase.part === 'topic2') break;
    }

    expect(furtherTexts).toEqual(qs.furtherQuestions.topic1.slice(0, furtherTexts.length));
    expect(furtherTexts.length).toBeLessThanOrEqual(MAX_FURTHER_QUESTIONS_PER_TOPIC);
    expect(state.furtherAskedCount.topic1).toBeLessThanOrEqual(MAX_FURTHER_QUESTIONS_PER_TOPIC);
  });

  it('C2: further questions are the authored on-topic strings, asked in order, never the synthesized placeholder', () => {
    let state = toTopic1();
    // Drive all 5 topic1 questions with short, thin, below-floor answers so we
    // reliably reach further-question territory without relying on extension timing.
    for (let i = 0; i < 5; i++) {
      let r = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
      state = r.state;
      if (r.action.kind === 'EXTENSION_PROMPT') {
        r = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
        state = r.state;
      }
    }

    const first = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
    state = first.state;
    expect(first.action).toMatchObject({ kind: 'FURTHER_QUESTION', text: qs.furtherQuestions.topic1[0] });
    expect(first.action.text).not.toMatch(/Question supplémentaire/);

    const second = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
    state = second.state;
    if (second.action.kind === 'FURTHER_QUESTION') {
      expect(second.action).toMatchObject({ text: qs.furtherQuestions.topic1[1] });
    }
  });

  it('extensionAskedCount never exceeds MAX_EXTENSIONS_PER_TOPIC even with all-thin answers', () => {
    let state = toTopic1();
    let guard = 0;
    while (guard < 30 && state.phase.kind === 'topic' && state.phase.part === 'topic1') {
      guard += 1;
      state = driveStep(qs, state, answer({ responseDurationS: 5, wordCount: 4 })).state;
    }
    expect(state.extensionAskedCount.topic1).toBeLessThanOrEqual(MAX_EXTENSIONS_PER_TOPIC);
  });

  it('C8: suppresses extension prompts once accumulated topic speaking reaches TOPIC_TARGET_S, but still advances through scripted questions', () => {
    let state = toTopic1();
    // Drive one long, thin (undeveloped) answer that alone crosses the 4-min target.
    // Thin by word count/duration so decideExtension WOULD normally fire.
    const r = driveStep(qs, state, answer({ wordCount: 4, responseDurationS: TOPIC_TARGET_S }));
    state = r.state;

    expect(state.topicSpeakingS.topic1).toBeGreaterThanOrEqual(TOPIC_TARGET_S);
    // No extension should be offered for this answer since the target is already met.
    expect(r.action.kind).not.toBe('EXTENSION_PROMPT');
    // Scripted advance still happens (either next question or further-question/floor logic).
    expect(['READ_MAIN', 'FURTHER_QUESTION', 'READ_ALTERNATIVE', 'REPEAT']).toContain(r.action.kind);

    // Subsequent thin answers in the same topic must never draw an extension prompt again.
    let guard = 0;
    while (guard < 10 && state.phase.kind === 'topic' && state.phase.part === 'topic1') {
      guard += 1;
      const next = driveStep(qs, state, answer({ wordCount: 4, responseDurationS: 5 }));
      state = next.state;
      expect(next.action.kind).not.toBe('EXTENSION_PROMPT');
    }
  });

  it('C8: extensionAskedCount does not grow once TOPIC_TARGET_S is reached', () => {
    let state = toTopic1();
    const r = driveStep(qs, state, answer({ wordCount: 4, responseDurationS: TOPIC_TARGET_S }));
    state = r.state;
    const countAtTarget = state.extensionAskedCount.topic1;

    let guard = 0;
    while (guard < 10 && state.phase.kind === 'topic' && state.phase.part === 'topic1') {
      guard += 1;
      state = driveStep(qs, state, answer({ wordCount: 4, responseDurationS: 5 })).state;
    }
    expect(state.extensionAskedCount.topic1).toBe(countAtTarget);
  });

  // ── C3: two-part topic questions (t1q4 has a distinct secondPartText) ──
  function developed(overrides: Partial<CandidateTurnResult> = {}): CandidateTurnResult {
    // wordCount >= DEVELOPED_ANSWER_WORDS so decideExtension returns null (no extension noise).
    return answer({ wordCount: 15, responseDurationS: 15, ...overrides });
  }

  /** Drives topic1 with developed answers up to (but not answering) t1q4 (index 3). */
  function toT1Q4(): ConductEngineState {
    let state = toTopic1();
    // t1q1, t1q2, t1q3 answered developed -> each advances directly (no extension, no second part).
    state = driveStep(qs, state, developed()).state; // -> t1q2 (+ TRANSITION)
    state = driveStep(qs, state, developed()).state; // -> t1q3 (+ TRANSITION)
    state = driveStep(qs, state, developed()).state; // -> t1q4 (+ TRANSITION)
    expect(state.phase).toMatchObject({ kind: 'topic', part: 'topic1', questionIndex: 3 });
    return state;
  }

  it('C3: delivers the distinct second-part prompt after a successful main answer (answer -> part2 -> answer -> advance)', () => {
    let state = toT1Q4();

    // Main answer to t1q4 -> engine reads the DISTINCT secondPartText, not mainText, not advance.
    // Second part is delivered by moveToSecondPartOrExtension, NOT the success funnel in
    // moveToExtensionOrAdvance, so it stays single-action (no TRANSITION before it).
    const part2 = driveOne(qs, state, developed());
    state = part2.state;
    expect(part2.action).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q4', variant: 'main', text: qs.questions[8].secondPartText });
    expect(part2.action.text).not.toBe(qs.questions[8].mainText);
    expect(state.topic1Questions[3].subState).toBe('secondPart');

    // Answer the second part -> advance to t1q5 (+ TRANSITION; never re-offers part 2, never reverses).
    const afterPart2 = driveStep(qs, state, developed());
    state = afterPart2.state;
    expect(afterPart2.actions.length).toBe(2);
    expect(afterPart2.actions[0].kind).toBe('TRANSITION');
    expect(afterPart2.action).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q5' });
  });

  it('C3: a failed second part gets exactly one verbatim repeat, then advances (no alternative on part 2)', () => {
    let state = toT1Q4();
    state = driveOne(qs, state, developed()).state; // main answered -> part 2 delivered
    expect(state.topic1Questions[3].subState).toBe('secondPart');

    // Silence on part 2 -> one repeat of the SECOND-PART text (not mainText, not the alternative).
    const repeat = driveOne(qs, state, noResponse());
    state = repeat.state;
    expect(repeat.action).toMatchObject({ kind: 'REPEAT', questionId: 't1q4', text: qs.questions[8].secondPartText });
    expect(repeat.action.kind).not.toBe('READ_ALTERNATIVE');
    expect(state.topic1Questions[3].secondPartRepeatUsed).toBe(true);

    // Failed repeat -> advance to t1q5 via the success funnel (+ TRANSITION); the
    // alternative is NEVER offered for a second part, and a FAILED repeat still
    // funnels through advanceWithTransition here because advanceTopicQuestion is
    // reached unconditionally once the one-repeat budget is exhausted.
    const afterFailed = driveStep(qs, state, noResponse());
    state = afterFailed.state;
    expect(afterFailed.action.kind).not.toBe('READ_ALTERNATIVE');
    expect(afterFailed.action).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q5' });
  });

  it('C3: a question answered via its ALTERNATIVE never delivers a second part', () => {
    let state = toT1Q4();
    // Fail the main + its repeat so the alternative is offered (t1q4 has alternativeTexts).
    state = driveOne(qs, state, noResponse()).state; // repeat main
    const alt = driveOne(qs, state, noResponse());
    state = alt.state;
    expect(alt.action).toMatchObject({ kind: 'READ_ALTERNATIVE', questionId: 't1q4' });
    expect(state.topic1Questions[3].subState).toBe('alternative');

    // Answer the alternative -> straight to advance (t1q5, + TRANSITION). No secondPart is ever entered.
    const afterAlt = driveStep(qs, state, developed());
    state = afterAlt.state;
    expect(state.topic1Questions[3].subState).not.toBe('secondPart');
    expect(afterAlt.action).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q5' });
  });

  it('C3: single-part questions (no secondPartText) never enter the secondPart sub-state', () => {
    let state = toTopic1();
    // t1q1 has no secondPartText -> a developed answer advances directly to t1q2 (+ TRANSITION).
    const r = driveStep(qs, state, developed());
    state = r.state;
    expect(state.topic1Questions[0].subState).not.toBe('secondPart');
    expect(r.action).toMatchObject({ kind: 'READ_MAIN', questionId: 't1q2' });
  });

  it('advances from topic1 to topic2 and eventually reaches complete with an END action', () => {
    let state = toTopic1();
    let guard = 0;
    let sawEnd = false;
    while (guard < 200 && !sawEnd) {
      guard += 1;
      const r = driveStep(qs, state, answer({ responseDurationS: 60 })); // long answers to clear the 4-min floor fast
      state = r.state;
      if (r.action.kind === 'END') sawEnd = true;
    }
    expect(sawEnd).toBe(true);
    expect(state.phase.kind).toBe('complete');
  });
});

describe('conductEngine: TRANSITION markers (C6)', () => {
  function toTopic1(): ConductEngineState {
    let state = initConductEngineState(qs);
    state = startConduct(qs, state).state;
    for (let i = 0; i < 6; i++) {
      state = driveOne(qs, state, answer()).state;
    }
    return state;
  }

  function developed(overrides: Partial<CandidateTurnResult> = {}): CandidateTurnResult {
    return answer({ wordCount: 15, responseDurationS: 15, ...overrides });
  }

  it('never emits TRANSITION during role play', () => {
    let state = initConductEngineState(qs);
    state = startConduct(qs, state).state;
    for (let i = 0; i < 6; i++) {
      const r = driveStep(qs, state, answer());
      state = r.state;
      expect(r.actions.some((a) => a.kind === 'TRANSITION')).toBe(false);
    }
  });

  it('emits exactly [TRANSITION, READ_MAIN] after a successfully-answered developed question', () => {
    const state = toTopic1();
    const r = driveStep(qs, state, developed());
    expect(r.actions.map((a) => a.kind)).toEqual(['TRANSITION', 'READ_MAIN']);
    expect(TRANSITION_MARKERS).toContain(r.actions[0].text);
  });

  it('alternates transition wording deterministically across successive successful answers', () => {
    let state = toTopic1();
    const first = driveStep(qs, state, developed());
    state = first.state;
    const second = driveStep(qs, state, developed());

    const firstTransition = first.actions.find((a) => a.kind === 'TRANSITION');
    const secondTransition = second.actions.find((a) => a.kind === 'TRANSITION');
    expect(firstTransition?.text).not.toBe(secondTransition?.text);
  });

  it('never emits TRANSITION after a failed repeat with no alternative (t1q1 has none)', () => {
    let state = toTopic1();
    state = driveOne(qs, state, noResponse()).state; // repeat
    const r = driveStep(qs, state, noResponse()); // failed repeat -> advance to t1q2
    // t1q1 has no alternativeTexts, so afterFailedMain falls straight through to
    // advanceTopicQuestion WITHOUT going through moveToExtensionOrAdvance's success
    // funnel -> no TRANSITION on this failure path.
    expect(r.actions.some((a) => a.kind === 'TRANSITION')).toBe(false);
  });

  it('never emits TRANSITION after a failed alternative (t1q3 has one)', () => {
    let state = toTopic1();
    state = driveStep(qs, state, developed()).state; // -> t1q2
    state = driveStep(qs, state, developed()).state; // -> t1q3
    state = driveOne(qs, state, noResponse()).state; // repeat main
    state = driveOne(qs, state, noResponse()).state; // failed repeat -> alternative offered
    const r = driveStep(qs, state, noResponse()); // failed alternative repeat -> advance
    expect(r.actions.some((a) => a.kind === 'TRANSITION')).toBe(false);
  });

  it('never emits TRANSITION on the final [advance] into END (no doubled closing marker)', () => {
    let state = toTopic1();
    let guard = 0;
    let sawEnd = false;
    let last: ReturnType<typeof driveStep> | null = null;
    while (guard < 200 && !sawEnd) {
      guard += 1;
      const r = driveStep(qs, state, answer({ responseDurationS: 60 }));
      state = r.state;
      last = r;
      if (r.action.kind === 'END') sawEnd = true;
    }
    expect(sawEnd).toBe(true);
    expect(last?.actions).toEqual([{ kind: 'END', part: 'topic2', questionId: null, variant: null, text: null, trigger: 'scripted' }]);
  });

  it('produces exactly [TRANSITION, FURTHER_QUESTION] when a further question follows a successful answer', () => {
    let state = toTopic1();
    for (let i = 0; i < 5; i++) {
      let r = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
      state = r.state;
      if (r.action.kind === 'EXTENSION_PROMPT') {
        r = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
        state = r.state;
      }
    }
    const r = driveStep(qs, state, answer({ responseDurationS: 1, wordCount: 1 }));
    expect(r.actions.map((a) => a.kind)).toEqual(['TRANSITION', 'FURTHER_QUESTION']);
  });

  it('EXTENSION_PROMPT itself is never preceded by a TRANSITION (extension is not an advance)', () => {
    const state = toTopic1();
    const r = driveStep(qs, state, answer({ wordCount: 4, responseDurationS: 5 }));
    if (r.action.kind === 'EXTENSION_PROMPT') {
      expect(r.actions.length).toBe(1);
    }
  });
});

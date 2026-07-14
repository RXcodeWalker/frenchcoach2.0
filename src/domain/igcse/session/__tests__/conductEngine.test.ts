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

function driveOne(
  qsSet: SessionQuestionSet,
  state: ConductEngineState,
  result: CandidateTurnResult,
): { state: ConductEngineState; action: ExaminerAction } {
  const stepResult = step(qsSet, state, { kind: 'candidateTurn', result });
  expect(stepResult.actions.length).toBe(1);
  return { state: stepResult.state, action: stepResult.actions[0] };
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

    // rp3 is partsExpected: 2 — first answer should re-read rp3 (part 2), not advance to rp4
    const part2 = driveOne(qs, state, answer());
    state = part2.state;
    expect(part2.action).toMatchObject({ kind: 'READ_MAIN', questionId: 'rp3' });
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
    state = driveOne(qs, state, answer()).state; // advance to q2
    state = driveOne(qs, state, answer()).state; // extension prompt for q2
    state = driveOne(qs, state, answer()).state; // advance to q3

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
      let r = driveOne(qs, state, answer({ responseDurationS: 5 }));
      state = r.state;
      if (r.action.kind === 'EXTENSION_PROMPT') {
        r = driveOne(qs, state, answer({ responseDurationS: 5 }));
        state = r.state;
      }
    }

    // Now should be in further-question territory (speakingS well under 3.5 min floor)
    expect(state.topicSpeakingS.topic1).toBeLessThan(TOPIC_SPEAKING_FLOOR_S);

    let furtherCount = 0;
    let guard = 0;
    while (state.furtherAskedCount.topic1 < MAX_FURTHER_QUESTIONS_PER_TOPIC + 1 && guard < 10) {
      guard += 1;
      const r = driveOne(qs, state, answer({ responseDurationS: 5 }));
      state = r.state;
      if (r.action.kind === 'FURTHER_QUESTION') furtherCount += 1;
      if (state.phase.kind === 'topic' && state.phase.part === 'topic2') break;
    }

    expect(furtherCount).toBeLessThanOrEqual(MAX_FURTHER_QUESTIONS_PER_TOPIC);
    expect(state.furtherAskedCount.topic1).toBeLessThanOrEqual(MAX_FURTHER_QUESTIONS_PER_TOPIC);
  });

  it('extensionAskedCount never exceeds MAX_EXTENSIONS_PER_TOPIC even with all-thin answers', () => {
    let state = toTopic1();
    let guard = 0;
    while (guard < 30 && state.phase.kind === 'topic' && state.phase.part === 'topic1') {
      guard += 1;
      state = driveOne(qs, state, answer({ responseDurationS: 5, wordCount: 4 })).state;
    }
    expect(state.extensionAskedCount.topic1).toBeLessThanOrEqual(MAX_EXTENSIONS_PER_TOPIC);
  });

  it('advances from topic1 to topic2 and eventually reaches complete with an END action', () => {
    let state = toTopic1();
    let guard = 0;
    let sawEnd = false;
    while (guard < 200 && !sawEnd) {
      guard += 1;
      const r = driveOne(qs, state, answer({ responseDurationS: 60 })); // long answers to clear the 4-min floor fast
      state = r.state;
      if (r.action.kind === 'END') sawEnd = true;
    }
    expect(sawEnd).toBe(true);
    expect(state.phase.kind).toBe('complete');
  });
});

// ── Learn overhaul Batch 1d — "Why this question?" never contradicts the level ─
// The old explanation came from the slot type alone: a stretch slot downgraded
// to target kept the stretch band and was labelled "Right at your level", ladder
// rungs 1–4 claimed "at your level" too, the review text ("found tricky") has
// been wrong since SM-2 (Phase 4.2), the raw demand id was shown, and a
// midSessionAdjust replacement lost its reason.

import { describe, it, expect } from 'vitest';
import { selectQuestions } from '../selectQuestions';
import { explainSelection } from '../explainSelection';
import { midSessionAdjust } from '../midSessionAdjust';
import { bandFor } from '../planSlots';
import { deriveDemandScore } from '../../demand/deriveDemandLevel';
import type { SelectQuestionsArgs, SessionSlot, SlotType } from '../types';
import type { CognitiveDemand, QuestionDemands } from '../../demand/types';
import type { ActiveSession, Question, SessionQuestion } from '../../../../types';

const DEMAND_IDS: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];

function makeDemands(overrides: Partial<QuestionDemands> = {}): QuestionDemands {
  return {
    cognitiveDemand: 'justify',
    timeFrames: ['present'],
    structures: ['justification'],
    responseLoad: 'developed',
    lexicalReach: 'everyday',
    sufficientAnswer: 'State an opinion and give at least one reason.',
    provenance: 'authored',
    ...overrides,
  };
}

function makeQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    topicKey: 'school',
    text: `Question ${id}`,
    hint: 'reasons',
    difficulty: 2,
    followUps: [],
    modelAnswer: 'Answer',
    keyVocab: [],
    ...overrides,
  };
}

function baseArgs(overrides: Partial<SelectQuestionsArgs> = {}): SelectQuestionsArgs {
  return {
    pool: [],
    slots: [],
    chosenIds: new Set(),
    seenIds: new Set(),
    focusSkillIds: [],
    activeDemandProblem: null,
    getReviewQuestion: () => null,
    ...overrides,
  };
}

describe('a downgraded stretch slot uses the target band (docs §8.1)', () => {
  it('never picks above the target band', () => {
    const T = 4.0;
    // Only inferred questions -> no trusted stretch candidate -> downgrade.
    const pool = [
      makeQuestion('justifyInferred', { demands: makeDemands({ cognitiveDemand: 'justify', provenance: 'inferred' }) }), // 6.0: inside the stretch band
      makeQuestion('explainInferred', { demands: makeDemands({ cognitiveDemand: 'explain', provenance: 'inferred' }) }), // 4.0: inside the target band
    ];
    const slots: SessionSlot[] = [{ type: 'stretch', band: bandFor('stretch', T) }];
    const { selected } = selectQuestions(baseArgs({ pool, slots, targetLevel: T }));
    expect(selected).toHaveLength(1);
    expect(selected[0].slot).toBe('target');
    const targetBand = bandFor('target', T)!;
    expect(deriveDemandScore(selected[0].question.demands!)).toBeLessThanOrEqual(targetBand.hi);
    expect(selected[0].question.id).toBe('explainInferred');
  });
});

describe('selectQuestions returns the ladder rung', () => {
  it('rung 0 for an unseen demand-bearing pick, 3 for a seen one, 4 for one without demands', () => {
    const slots: SessionSlot[] = [{ type: 'target', band: bandFor('target', 6) }];
    const unseen = selectQuestions(baseArgs({ pool: [makeQuestion('a', { demands: makeDemands() })], slots, targetLevel: 6 }));
    expect(unseen.selected[0].rung).toBe(0);
    const seen = selectQuestions(baseArgs({ pool: [makeQuestion('a', { demands: makeDemands() })], slots, seenIds: new Set(['a']), targetLevel: 6 }));
    expect(seen.selected[0].rung).toBe(3);
    const noDemands = selectQuestions(baseArgs({ pool: [makeQuestion('n')], slots, targetLevel: 6 }));
    expect(noDemands.selected[0].rung).toBe(4);
  });

  it('a rung >= 2 pick never says "at your level"', () => {
    const slots: SessionSlot[] = [{ type: 'target', band: bandFor('target', 6) }];
    const seen = selectQuestions(baseArgs({ pool: [makeQuestion('a', { demands: makeDemands() })], slots, seenIds: new Set(['a']), targetLevel: 6 }));
    expect(seen.selected[0].reason.explanation.toLowerCase()).not.toContain('at your level');
    const noDemands = selectQuestions(baseArgs({ pool: [makeQuestion('n')], slots, targetLevel: 6 }));
    expect(noDemands.selected[0].reason.explanation.toLowerCase()).not.toContain('at your level');
  });

  it('a far-off-band rung-0 pick is not called "at your level"', () => {
    // Rung 0 still hits when nothing fits the band (the other score terms keep
    // it above zero), so the text must compare the real level with the target.
    const slots: SessionSlot[] = [{ type: 'target', band: bandFor('target', 2) }];
    const { selected } = selectQuestions(baseArgs({ pool: [makeQuestion('hard', { demands: makeDemands({ cognitiveDemand: 'hypothesize' }) })], slots, targetLevel: 2 }));
    expect(selected[0].reason.explanation.toLowerCase()).not.toContain('at your level');
    expect(selected[0].reason.explanation.toLowerCase()).toContain('harder');
  });
});

describe('explainSelection', () => {
  const slots: SlotType[] = ['warmup', 'review', 'target', 'stretch', 'choice'];

  it('rung >= 2 never says "at your level", for any slot and level', () => {
    for (const slot of slots) {
      for (const rung of [2, 3, 4]) {
        for (const questionLevel of [null, 2, 4, 6, 8]) {
          const text = explainSelection({ slot, rung, questionLevel, targetLevel: 4 }).toLowerCase();
          expect(text).not.toContain('at your level');
        }
      }
    }
  });

  it('an in-band rung-0 target pick is "at your level"', () => {
    expect(explainSelection({ slot: 'target', rung: 0, questionLevel: 4.2, targetLevel: 4 }).toLowerCase()).toContain('at your level');
  });

  it('review wording is about spaced practice, not "found tricky"', () => {
    const text = explainSelection({ slot: 'review', rung: 0, questionLevel: 4, targetLevel: 4 });
    expect(text.toLowerCase()).not.toContain('tricky');
    expect(text.toLowerCase()).toContain('review');
  });

  it('never shows a raw demand id', () => {
    for (const slot of slots) {
      for (const rung of [0, 1, 2, 3, 4]) {
        for (const questionLevel of [null, 1, 4, 6.5, 9]) {
          for (const targetLevel of [null, 4]) {
            const text = explainSelection({ slot, rung, questionLevel, targetLevel }).toLowerCase();
            for (const id of DEMAND_IDS) expect(text).not.toContain(id);
          }
        }
      }
    }
  });

  it('a pick end-to-end never leaks a raw demand id', () => {
    for (const cognitiveDemand of DEMAND_IDS) {
      const { selected } = selectQuestions(baseArgs({
        pool: [makeQuestion(cognitiveDemand, { demands: makeDemands({ cognitiveDemand }) })],
        slots: [{ type: 'target', band: bandFor('target', 4) }],
        targetLevel: 4,
      }));
      expect(selected[0].reason.explanation.toLowerCase()).not.toContain(cognitiveDemand);
    }
  });
});

describe('midSessionAdjust replacements carry a reason', () => {
  function sq(question: Question, overrides: Partial<SessionQuestion>): SessionQuestion {
    return { question, status: 'pending', attempts: [], bestScore: null, savedVocab: [], isReview: false, ...overrides };
  }

  it('an eased target replacement has a selectionReason', () => {
    const answered1 = makeQuestion('done1', { demands: makeDemands({ cognitiveDemand: 'describe' }) });
    const answered2 = makeQuestion('done2', { demands: makeDemands({ cognitiveDemand: 'describe' }) });
    const current = makeQuestion('current', { demands: makeDemands({ cognitiveDemand: 'describe' }) });
    const hard = makeQuestion('hard', { demands: makeDemands({ cognitiveDemand: 'justify' }) });
    const easy = makeQuestion('easy', { demands: makeDemands({ cognitiveDemand: 'explain' }) });
    const band = bandFor('target', 6);
    const session = {
      id: 's', topicKey: 'school', mode: 'quick', targetCount: 4,
      questions: [
        sq(answered1, { status: 'completed', bestScore: 3 }),
        sq(answered2, { status: 'completed', bestScore: 3 }),
        sq(current, { slotType: 'target', slotBand: band }),
        sq(hard, { slotType: 'target', slotBand: band }),
      ],
      currentIndex: 2, questionsCompleted: 2, answerStreak: 0, bestStreak: 0, xpAccumulated: 0, gemsAccumulated: 0,
      totalWords: 0, startedAt: new Date().toISOString(), skillSnapshot: {},
    } as unknown as ActiveSession;

    const result = midSessionAdjust({
      session,
      pool: [answered1, answered2, current, hard, easy],
      seenIds: new Set(),
      focusSkillIds: [],
      activeDemandProblem: null,
      beliefSnapshot: null,
      alreadyAdjustedThisSession: false,
    });
    expect(result.changed).toBe(true);
    const replaced = result.session.questions[3];
    expect(replaced.question.id).toBe('easy');
    expect(replaced.selectionReason?.explanation.length).toBeGreaterThan(0);
    expect(replaced.selectionReason?.slot).toBe('target');
  });
});

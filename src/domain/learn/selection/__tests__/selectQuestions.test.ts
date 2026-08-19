import { describe, it, expect } from 'vitest';
import { selectQuestions } from '../selectQuestions';
import { planSlots } from '../planSlots';
import type { Question } from '../../../../types';
import type { QuestionDemands } from '../../demand/types';
import type { SelectQuestionsArgs, SessionSlot } from '../types';
import type { SessionBlend } from '../../../../types/coach';

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

const NO_REVIEW = () => null;

const BLEND: SessionBlend = {
  warmupPct: 20,
  reviewPct: 30,
  targetSkillPct: 30,
  stretchPct: 10,
  choicePct: 10,
  focusSkillIds: [],
};

function baseArgs(overrides: Partial<SelectQuestionsArgs> = {}): SelectQuestionsArgs {
  return {
    pool: [],
    slots: [],
    chosenIds: new Set(),
    seenIds: new Set(),
    focusSkillIds: [],
    activeDemandProblem: null,
    getReviewQuestion: NO_REVIEW,
    ...overrides,
  };
}

describe('selectQuestions', () => {
  it('fills a single target slot in-band with a demand-bearing question', () => {
    const pool = [
      makeQuestion('describe1', { demands: makeDemands({ cognitiveDemand: 'describe' }) }), // score ~2.0
      makeQuestion('justify1', { demands: makeDemands({ cognitiveDemand: 'justify' }) }), // score 6.0
    ];
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 5.5, hi: 6.5 } }];
    const { selected, targetCount } = selectQuestions(baseArgs({ pool, slots }));
    expect(targetCount).toBe(1);
    expect(selected[0].question.id).toBe('justify1');
    expect(selected[0].slot).toBe('target');
  });

  it('never duplicates a question across slots', () => {
    const pool = [
      makeQuestion('a', { demands: makeDemands({ cognitiveDemand: 'justify' }) }),
      makeQuestion('b', { demands: makeDemands({ cognitiveDemand: 'compare' }) }),
    ];
    const slots: SessionSlot[] = [
      { type: 'target', band: { lo: 0, hi: 10 } },
      { type: 'choice', band: { lo: 0, hi: 10 } },
      { type: 'warmup', band: { lo: 0, hi: 10 } },
    ];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    const ids = selected.map((s) => s.question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns fewer than requested (rung 5) rather than duplicate when the pool is exhausted', () => {
    const pool = [makeQuestion('only1', { demands: makeDemands({ cognitiveDemand: 'justify' }) })];
    const slots: SessionSlot[] = [
      { type: 'target', band: { lo: 0, hi: 10 } },
      { type: 'choice', band: { lo: 0, hi: 10 } },
      { type: 'warmup', band: { lo: 0, hi: 10 } },
    ];
    const { selected, targetCount } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected).toHaveLength(1);
    expect(targetCount).toBe(1);
  });

  it('never throws on an empty pool', () => {
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 0, hi: 10 } }];
    expect(() => selectQuestions(baseArgs({ pool: [], slots }))).not.toThrow();
    const { selected, targetCount } = selectQuestions(baseArgs({ pool: [], slots }));
    expect(selected).toHaveLength(0);
    expect(targetCount).toBe(0);
  });

  it('rung 1: widens the band by +-1.0 when nothing fits the planned band', () => {
    // demandScore for justify/developed/present ~= 6.0. Planned band is far off,
    // but widened by 1.0 the question becomes reachable via decayed bandFit>0.
    const pool = [makeQuestion('j', { demands: makeDemands({ cognitiveDemand: 'justify' }) })];
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 7.5, hi: 8.5 } }]; // 1.5 above the demand score
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected).toHaveLength(1);
    expect(selected[0].question.id).toBe('j');
  });

  it('rung 3: falls back to a seen question when only seen questions remain', () => {
    const pool = [makeQuestion('seenOnly', { demands: makeDemands({ cognitiveDemand: 'justify' }) })];
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 5.5, hi: 6.5 } }];
    const { selected } = selectQuestions(baseArgs({ pool, slots, seenIds: new Set(['seenOnly']) }));
    expect(selected).toHaveLength(1);
    expect(selected[0].question.id).toBe('seenOnly');
  });

  it('rung 4: allows a question without demands when nothing with demands is available', () => {
    const pool = [makeQuestion('noDemands')];
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 5.5, hi: 6.5 } }];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected).toHaveLength(1);
    expect(selected[0].question.id).toBe('noDemands');
  });

  it('a question lacking demands is never placed in a stretch slot', () => {
    const pool = [makeQuestion('noDemands')];
    const slots: SessionSlot[] = [{ type: 'stretch', band: { lo: 7.5, hi: 9.0 } }];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    // Downgraded to target internally, since no trusted stretch candidate exists,
    // and then rung 4 picks up the no-demands question under the target label.
    expect(selected).toHaveLength(1);
    expect(selected[0].slot).toBe('target');
  });

  it('an inferred-provenance question is never placed in a stretch slot', () => {
    const pool = [makeQuestion('inferred1', { demands: makeDemands({ cognitiveDemand: 'hypothesize', provenance: 'inferred' }) })];
    const slots: SessionSlot[] = [{ type: 'stretch', band: { lo: 7.5, hi: 9.0 } }];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected).toHaveLength(1);
    expect(selected[0].slot).toBe('target'); // downgraded
  });

  it('an authored-provenance question in-band fills the stretch slot', () => {
    const pool = [makeQuestion('authored1', { demands: makeDemands({ cognitiveDemand: 'hypothesize', provenance: 'authored' }) })]; // score 8.0
    const slots: SessionSlot[] = [{ type: 'stretch', band: { lo: 7.5, hi: 9.0 } }];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected).toHaveLength(1);
    expect(selected[0].slot).toBe('stretch');
    expect(selected[0].question.id).toBe('authored1');
  });

  it('the review slot is filled via getReviewQuestion, not the topic pool ranking', () => {
    const reviewQ = makeQuestion('reviewQ');
    const pool = [makeQuestion('other', { demands: makeDemands() })];
    const slots: SessionSlot[] = [{ type: 'review', band: null }];
    const { selected } = selectQuestions(baseArgs({ pool, slots, getReviewQuestion: () => reviewQ }));
    expect(selected).toHaveLength(1);
    expect(selected[0].question.id).toBe('reviewQ');
    expect(selected[0].slot).toBe('review');
  });

  it('a review slot with no eligible review question is simply skipped (no crash, no fallback fill)', () => {
    const slots: SessionSlot[] = [{ type: 'review', band: null }];
    const { selected, targetCount } = selectQuestions(baseArgs({ pool: [], slots }));
    expect(selected).toHaveLength(0);
    expect(targetCount).toBe(0);
  });

  it('respects the fixed fill order (review, stretch, target, warmup, choice) for deterministic exhaustion', () => {
    // Only one question with demands available; stretch is prioritized over
    // target/warmup/choice, so it should win the single slot even though
    // it's listed last in the `slots` array.
    const pool = [makeQuestion('sole', { demands: makeDemands({ cognitiveDemand: 'hypothesize', provenance: 'authored' }) })];
    const slots: SessionSlot[] = [
      { type: 'choice', band: { lo: 7.5, hi: 9.0 } },
      { type: 'warmup', band: { lo: 7.5, hi: 9.0 } },
      { type: 'target', band: { lo: 7.5, hi: 9.0 } },
      { type: 'stretch', band: { lo: 7.5, hi: 9.0 } },
    ];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected).toHaveLength(1);
    expect(selected[0].slot).toBe('stretch');
  });

  it('is deterministic for a fixed seed (tie-break by fnv1a)', () => {
    const pool = [
      makeQuestion('tieA', { demands: makeDemands({ cognitiveDemand: 'justify' }) }),
      makeQuestion('tieB', { demands: makeDemands({ cognitiveDemand: 'justify' }) }),
    ];
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 5.5, hi: 6.5 } }];
    const run1 = selectQuestions(baseArgs({ pool, slots }));
    const run2 = selectQuestions(baseArgs({ pool, slots }));
    expect(run1.selected.map((s) => s.question.id)).toEqual(run2.selected.map((s) => s.question.id));
  });

  it('every pick carries a SelectionReason with a slot and a non-empty explanation', () => {
    const pool = [makeQuestion('x', { demands: makeDemands({ cognitiveDemand: 'justify' }) })];
    const slots: SessionSlot[] = [{ type: 'target', band: { lo: 5.5, hi: 6.5 } }];
    const { selected } = selectQuestions(baseArgs({ pool, slots }));
    expect(selected[0].reason.slot).toBe('target');
    expect(selected[0].reason.explanation.length).toBeGreaterThan(0);
  });

  it('integrates end-to-end with planSlots for a 10-question session on a small pool', () => {
    const pool = Array.from({ length: 6 }, (_, i) =>
      makeQuestion(`q${i}`, { demands: makeDemands({ cognitiveDemand: i % 2 === 0 ? 'justify' : 'compare' }) }),
    );
    const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 6, count: 10 });
    const { selected, targetCount } = selectQuestions(baseArgs({ pool, slots }));
    expect(targetCount).toBeLessThanOrEqual(10);
    const ids = selected.map((s) => s.question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

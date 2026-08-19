import { describe, it, expect } from 'vitest';
import { midSessionAdjust } from '../midSessionAdjust';
import type { MidSessionAdjustArgs } from '../midSessionAdjust';
import type { ActiveSession, Question, SessionQuestion } from '../../../../types';
import type { QuestionDemands } from '../../demand/types';

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

function completed(question: Question, score: number | null): SessionQuestion {
  return {
    question,
    status: 'completed',
    attempts: score === null ? [] : [{ transcript: 'x', score, xpEarned: 0, feedback: {} as never, durationSec: 10, attemptIndex: 1 }],
    bestScore: score,
    savedVocab: [],
    isReview: false,
  };
}

function pending(question: Question, slotType: SessionQuestion['slotType'], slotBand: SessionQuestion['slotBand'] = { lo: 4.5, hi: 5.5 }): SessionQuestion {
  return {
    question,
    status: 'pending',
    attempts: [],
    bestScore: null,
    savedVocab: [],
    isReview: false,
    slotType,
    slotBand,
  };
}

function reviewPending(question: Question): SessionQuestion {
  return {
    question,
    status: 'pending',
    attempts: [],
    bestScore: null,
    savedVocab: [],
    isReview: true,
    slotType: 'review',
    slotBand: null,
  };
}

function makeSession(questions: SessionQuestion[], currentIndex: number): ActiveSession {
  return {
    id: 'sess-1',
    topicKey: 'school',
    mode: 'standard',
    targetCount: questions.length,
    questions,
    currentIndex,
    questionsCompleted: currentIndex,
    answerStreak: 0,
    bestStreak: 0,
    xpAccumulated: 0,
    gemsAccumulated: 0,
    totalWords: 0,
    startedAt: new Date().toISOString(),
    skillSnapshot: {},
  };
}

function baseArgs(session: ActiveSession, pool: Question[], overrides: Partial<MidSessionAdjustArgs> = {}): MidSessionAdjustArgs {
  return {
    session,
    pool,
    seenIds: new Set(),
    focusSkillIds: [],
    activeDemandProblem: null,
    beliefSnapshot: null,
    alreadyAdjustedThisSession: false,
    ...overrides,
  };
}

describe('midSessionAdjust', () => {
  it('never fires before question 3 (currentIndex < 2)', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const q3 = makeQuestion('q3', { demands: makeDemands({ cognitiveDemand: 'justify' }) });
    const session = makeSession(
      [completed(q1, 2), completed(q2, 3), pending(q3, 'target')],
      1, // only 1 completed so far -> too early
    );
    const result = midSessionAdjust(baseArgs(session, [q1, q2, q3]));
    expect(result.changed).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.session).toBe(session);
  });

  it('eases after 2 consecutive sub-5 scores: stretch -> target, target band shifts down 1.0', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const active = makeQuestion('active-now'); // sits at currentIndex itself -> not eligible (docs §8.4: index > currentIndex)
    const stretchQ = makeQuestion('stretch-orig');
    const targetQ = makeQuestion('target-orig');
    const replacementForStretch = makeQuestion('easy-fill', { demands: makeDemands({ cognitiveDemand: 'compare' }) }); // demandScore 6.5, fits the stretch slot's own (unshifted) band [5.75,7.0]
    const replacementForTarget = makeQuestion('target-fill', { demands: makeDemands({ cognitiveDemand: 'justify' }) }); // demandScore 6.0

    const pool = [q1, q2, active, stretchQ, targetQ, replacementForStretch, replacementForTarget];

    const session = makeSession(
      [
        completed(q1, 3),
        completed(q2, 4),
        pending(active, 'target'), // currentIndex points here — the "about to be shown" question
        pending(stretchQ, 'stretch', { lo: 5.75, hi: 7.0 }),
        pending(targetQ, 'target', { lo: 5.5, hi: 6.5 }),
      ],
      2,
    );

    const result = midSessionAdjust(baseArgs(session, pool));
    expect(result.direction).toBe('ease');
    expect(result.changed).toBe(true);

    const [, , stillActive, newStretchSlot, newTargetSlot] = result.session.questions;
    // the question at currentIndex itself is never touched
    expect(stillActive.question.id).toBe('active-now');
    // stretch became target
    expect(newStretchSlot.slotType).toBe('target');
    expect(newStretchSlot.question.id).not.toBe('stretch-orig');
    // target band dropped by 1.0: [5.5,6.5] -> [4.5,5.5]
    expect(newTargetSlot.slotType).toBe('target');
    expect(newTargetSlot.slotBand).toEqual({ lo: 4.5, hi: 5.5 });
  });

  it('raises after 3 consecutive scores >= 8: exactly one target slot becomes stretch', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const q3 = makeQuestion('q3');
    const targetA = makeQuestion('target-a');
    const targetB = makeQuestion('target-b');
    const stretchFill = makeQuestion('stretch-fill', { demands: makeDemands({ cognitiveDemand: 'hypothesize', provenance: 'authored' }) }); // demandScore 8.0

    const pool = [q1, q2, q3, targetA, targetB, stretchFill];

    const session = makeSession(
      [
        completed(q1, 8),
        completed(q2, 9),
        completed(q3, 8),
        pending(targetA, 'target', { lo: 7.5, hi: 8.5 }),
        pending(targetB, 'target', { lo: 5.5, hi: 6.5 }),
      ],
      3,
    );

    const result = midSessionAdjust(baseArgs(session, pool));
    expect(result.direction).toBe('raise');
    expect(result.changed).toBe(true);

    const changedSlots = result.session.questions.filter((sq) => sq.slotType === 'stretch');
    expect(changedSlots).toHaveLength(1);
    // only one target slot was touched; the other remains target
    const stillTarget = result.session.questions.filter((sq) => sq.slotType === 'target');
    expect(stillTarget).toHaveLength(1);
  });

  it('never replaces an answered (completed) slot', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const alreadyAnswered = makeQuestion('answered', { demands: makeDemands() });
    const pendingQ = makeQuestion('pending-target', { demands: makeDemands() });
    const fill = makeQuestion('fill', { demands: makeDemands({ cognitiveDemand: 'describe' }) });

    const session = makeSession(
      [
        completed(q1, 2),
        completed(q2, 3),
        { ...completed(alreadyAnswered, 9), status: 'completed' },
        pending(pendingQ, 'target'),
      ],
      3,
    );

    const result = midSessionAdjust(baseArgs(session, [q1, q2, alreadyAnswered, pendingQ, fill]));
    // The completed slot must be untouched regardless of what direction fires.
    const untouchedCompleted = result.session.questions.find((sq) => sq.question.id === 'answered');
    expect(untouchedCompleted?.status).toBe('completed');
    expect(untouchedCompleted?.bestScore).toBe(9);
  });

  it('never replaces the review slot', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const reviewQ = makeQuestion('review-q');
    const targetQ = makeQuestion('target-q', { demands: makeDemands() });
    const fill = makeQuestion('fill', { demands: makeDemands({ cognitiveDemand: 'describe' }) });

    const session = makeSession(
      [completed(q1, 2), completed(q2, 3), reviewPending(reviewQ), pending(targetQ, 'target')],
      2,
    );

    const result = midSessionAdjust(baseArgs(session, [q1, q2, reviewQ, targetQ, fill]));
    const stillReview = result.session.questions.find((sq) => sq.question.id === 'review-q');
    expect(stillReview).toBeDefined();
    expect(stillReview?.isReview).toBe(true);
  });

  it('never changes targetCount', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const targetQ = makeQuestion('target-q', { demands: makeDemands() });
    const fill = makeQuestion('fill', { demands: makeDemands({ cognitiveDemand: 'describe' }) });

    const session = makeSession([completed(q1, 2), completed(q2, 3), pending(targetQ, 'target')], 2);
    const before = session.targetCount;

    const result = midSessionAdjust(baseArgs(session, [q1, q2, targetQ, fill]));
    expect(result.session.targetCount).toBe(before);
    expect(result.session.questions).toHaveLength(session.questions.length);
  });

  it('is a no-op (changed: false, session unchanged) when no direction is detected', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const targetQ = makeQuestion('target-q', { demands: makeDemands() });

    // Mixed scores: not 2 consecutive <5, not 3 consecutive >=8.
    const session = makeSession([completed(q1, 6), completed(q2, 7), pending(targetQ, 'target')], 2);
    const result = midSessionAdjust(baseArgs(session, [q1, q2, targetQ]));

    expect(result.changed).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.session).toBe(session);
  });

  it('is a no-op when alreadyAdjustedThisSession is true, even if a direction would fire', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const targetQ = makeQuestion('target-q', { demands: makeDemands() });
    const fill = makeQuestion('fill', { demands: makeDemands({ cognitiveDemand: 'describe' }) });

    const session = makeSession([completed(q1, 2), completed(q2, 3), pending(targetQ, 'target')], 2);
    const result = midSessionAdjust(baseArgs(session, [q1, q2, targetQ, fill], { alreadyAdjustedThisSession: true }));

    expect(result.changed).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.session).toBe(session);
  });

  it('leaves a slot as-is when no candidate fits the adjusted band (fallback, no throw)', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const targetQ = makeQuestion('target-q', { demands: makeDemands() });
    // No other questions in the pool at all -> nothing can replace targetQ.
    const session = makeSession([completed(q1, 2), completed(q2, 3), pending(targetQ, 'target')], 2);

    const result = midSessionAdjust(baseArgs(session, [q1, q2, targetQ]));
    expect(result.changed).toBe(false);
    expect(result.session).toBe(session);
  });

  it('does not touch legacy-path questions lacking slotType', () => {
    const q1 = makeQuestion('q1');
    const q2 = makeQuestion('q2');
    const legacyPending: SessionQuestion = {
      question: makeQuestion('legacy'),
      status: 'pending',
      attempts: [],
      bestScore: null,
      savedVocab: [],
      isReview: false,
      // slotType/slotBand intentionally absent
    };
    const session = makeSession([completed(q1, 2), completed(q2, 3), legacyPending], 2);

    const result = midSessionAdjust(baseArgs(session, [q1, q2, legacyPending.question]));
    expect(result.changed).toBe(false);
    expect(result.session).toBe(session);
  });
});

import { describe, it, expect } from 'vitest';
import {
  bandFit,
  coachFocusMatch,
  demandCoverageGap,
  exposureFreshness,
  provenanceTrust,
  sessionRepetition,
  scoreCandidate,
} from '../scoreCandidate';
import type { Question } from '../../../../types';
import type { QuestionDemands } from '../../demand/types';
import type { ScoreCandidateArgs, SelectionCandidate, SessionSlot } from '../types';

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

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    topicKey: 'school',
    text: 'Pourquoi aimes-tu ton école ?',
    hint: 'reasons',
    difficulty: 2,
    followUps: [],
    modelAnswer: 'Answer',
    keyVocab: [],
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<SelectionCandidate> = {}): SelectionCandidate {
  return {
    question: makeQuestion(),
    demandNodeConfidence: null,
    seen: false,
    cognitiveDemandUsedThisSession: false,
    ...overrides,
  };
}

describe('bandFit', () => {
  it('scores 1 when the demand score is inside the band', () => {
    expect(bandFit(5, { lo: 4, hi: 6 })).toBe(1);
  });

  it('scores 1 at the band edges (inclusive)', () => {
    expect(bandFit(4, { lo: 4, hi: 6 })).toBe(1);
    expect(bandFit(6, { lo: 4, hi: 6 })).toBe(1);
  });

  it('decays linearly below the band', () => {
    expect(bandFit(3, { lo: 4, hi: 6 })).toBeCloseTo(0.5, 5);
    expect(bandFit(2, { lo: 4, hi: 6 })).toBeCloseTo(0, 5);
  });

  it('decays linearly above the band', () => {
    expect(bandFit(7, { lo: 4, hi: 6 })).toBeCloseTo(0.5, 5);
    expect(bandFit(8, { lo: 4, hi: 6 })).toBeCloseTo(0, 5);
  });

  it('clamps at 0, never negative, far outside the band', () => {
    expect(bandFit(-10, { lo: 4, hi: 6 })).toBe(0);
    expect(bandFit(100, { lo: 4, hi: 6 })).toBe(0);
  });

  it('a null band (review slot) always fits', () => {
    expect(bandFit(0, null)).toBe(1);
    expect(bandFit(10, null)).toBe(1);
  });
});

describe('coachFocusMatch', () => {
  const slot: SessionSlot = { type: 'target', band: { lo: 0, hi: 10 } };

  it('matches when a structure intersects focusSkillIds', () => {
    const args: ScoreCandidateArgs = {
      candidate: makeCandidate({ question: makeQuestion({ demands: makeDemands({ structures: ['subjunctive'] }) }) }),
      slot,
      focusSkillIds: ['subjunctive'],
      activeDemandProblem: null,
    };
    expect(coachFocusMatch(args)).toBe(1);
  });

  it('matches when cognitiveDemand equals the active demand problem', () => {
    const args: ScoreCandidateArgs = {
      candidate: makeCandidate({ question: makeQuestion({ demands: makeDemands({ cognitiveDemand: 'compare' }) }) }),
      slot,
      focusSkillIds: [],
      activeDemandProblem: 'compare',
    };
    expect(coachFocusMatch(args)).toBe(1);
  });

  it('is 0 with no overlap and no matching problem', () => {
    const args: ScoreCandidateArgs = {
      candidate: makeCandidate({ question: makeQuestion({ demands: makeDemands() }) }),
      slot,
      focusSkillIds: ['subjunctive'],
      activeDemandProblem: 'hypothesize',
    };
    expect(coachFocusMatch(args)).toBe(0);
  });

  it('is 0 for a question with no demands at all', () => {
    const args: ScoreCandidateArgs = {
      candidate: makeCandidate({ question: makeQuestion() }),
      slot,
      focusSkillIds: ['subjunctive'],
      activeDemandProblem: 'justify',
    };
    expect(coachFocusMatch(args)).toBe(0);
  });
});

describe('demandCoverageGap', () => {
  it('is 1 minus the node confidence when present', () => {
    expect(demandCoverageGap(makeCandidate({ demandNodeConfidence: 0.3 }))).toBeCloseTo(0.7, 5);
  });

  it('is 1.0 (max gap) when the node is absent', () => {
    expect(demandCoverageGap(makeCandidate({ demandNodeConfidence: null }))).toBe(1.0);
  });
});

describe('exposureFreshness', () => {
  it('is 1.0 for unseen questions', () => {
    expect(exposureFreshness(makeCandidate({ seen: false }))).toBe(1.0);
  });

  it('is 0.2 for seen questions', () => {
    expect(exposureFreshness(makeCandidate({ seen: true }))).toBe(0.2);
  });
});

describe('provenanceTrust', () => {
  it('authored = 1.0, reviewed = 0.7, inferred = 0.3', () => {
    expect(provenanceTrust(makeCandidate({ question: makeQuestion({ demands: makeDemands({ provenance: 'authored' }) }) }))).toBe(1.0);
    expect(provenanceTrust(makeCandidate({ question: makeQuestion({ demands: makeDemands({ provenance: 'reviewed' }) }) }))).toBe(0.7);
    expect(provenanceTrust(makeCandidate({ question: makeQuestion({ demands: makeDemands({ provenance: 'inferred' }) }) }))).toBe(0.3);
  });

  it('is 0 for a question with no demands', () => {
    expect(provenanceTrust(makeCandidate({ question: makeQuestion() }))).toBe(0);
  });
});

describe('sessionRepetition', () => {
  it('is 1 when the cognitiveDemand was already used this session', () => {
    expect(sessionRepetition(makeCandidate({ cognitiveDemandUsedThisSession: true }))).toBe(1);
  });

  it('is 0 otherwise', () => {
    expect(sessionRepetition(makeCandidate({ cognitiveDemandUsedThisSession: false }))).toBe(0);
  });
});

describe('scoreCandidate', () => {
  it('sums all weighted terms for a fully-known candidate in-band', () => {
    const slot: SessionSlot = { type: 'target', band: { lo: 4, hi: 6 } };
    const candidate = makeCandidate({
      question: makeQuestion({ demands: makeDemands({ structures: ['subjunctive'], provenance: 'authored' }) }),
      demandNodeConfidence: 0.2,
      seen: false,
      cognitiveDemandUsedThisSession: false,
    });
    const args: ScoreCandidateArgs = { candidate, slot, focusSkillIds: ['subjunctive'], activeDemandProblem: null };
    // 3.0*1 (bandFit=5 in [4,6]) + 2.0*1 (focus match) + 1.5*0.8 (gap) + 1.0*1 (fresh) + 0.5*1.0 (authored) - 1.0*0
    const expected = 3.0 * 1 + 2.0 * 1 + 1.5 * 0.8 + 1.0 * 1 + 0.5 * 1.0 - 1.0 * 0;
    expect(scoreCandidate(args, 5)).toBeCloseTo(expected, 5);
  });

  it('omits the bandFit term entirely (not a fixed default) when demandScore is null', () => {
    const slot: SessionSlot = { type: 'stretch', band: { lo: 8, hi: 10 } };
    const candidate = makeCandidate({ question: makeQuestion(), demandNodeConfidence: null, seen: false });
    const args: ScoreCandidateArgs = { candidate, slot, focusSkillIds: [], activeDemandProblem: null };
    // No demands => coachFocusMatch=0, demandCoverageGap=1.0 (absent), exposureFreshness=1.0, provenanceTrust=0, sessionRepetition=0
    const expected = 0 + 2.0 * 0 + 1.5 * 1.0 + 1.0 * 1 + 0.5 * 0 - 1.0 * 0;
    expect(scoreCandidate(args, null)).toBeCloseTo(expected, 5);
  });

  it('score is within the documented [-1.0, 8.0] range for any term combination', () => {
    const slot: SessionSlot = { type: 'target', band: { lo: 4, hi: 6 } };
    const worst: ScoreCandidateArgs = {
      candidate: makeCandidate({
        question: makeQuestion({ demands: makeDemands({ provenance: 'inferred' }) }),
        demandNodeConfidence: 1.0,
        seen: true,
        cognitiveDemandUsedThisSession: true,
      }),
      slot,
      focusSkillIds: [],
      activeDemandProblem: null,
    };
    expect(scoreCandidate(worst, 0)).toBeGreaterThanOrEqual(-1.0);
    const best: ScoreCandidateArgs = {
      candidate: makeCandidate({
        question: makeQuestion({ demands: makeDemands({ structures: ['subjunctive'], provenance: 'authored' }) }),
        demandNodeConfidence: 0,
        seen: false,
        cognitiveDemandUsedThisSession: false,
      }),
      slot,
      focusSkillIds: ['subjunctive'],
      activeDemandProblem: null,
    };
    expect(scoreCandidate(best, 5)).toBeLessThanOrEqual(8.0);
  });
});

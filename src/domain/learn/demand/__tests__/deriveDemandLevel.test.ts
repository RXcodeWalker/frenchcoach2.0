import { describe, it, expect } from 'vitest';
import {
  deriveDemandScore,
  demandScoreToLevel,
  deriveDemandLevel,
  DESCRIBE_PAST_FUTURE_FLOOR,
} from '../deriveDemandLevel';
import type { QuestionDemands } from '../types';

function demands(overrides: Partial<QuestionDemands>): QuestionDemands {
  return {
    cognitiveDemand: 'describe',
    timeFrames: ['present'],
    structures: [],
    responseLoad: 'developed',
    lexicalReach: 'everyday',
    sufficientAnswer: 'State at least one fact.',
    provenance: 'authored',
    ...overrides,
  };
}

describe('deriveDemandScore', () => {
  it.each<[string, Partial<QuestionDemands>, number]>([
    ['describe base, developed, everyday, one time frame', {}, 2.0],
    ['explain base', { cognitiveDemand: 'explain' }, 4.0],
    ['justify base', { cognitiveDemand: 'justify' }, 6.0],
    ['compare base', { cognitiveDemand: 'compare' }, 6.5],
    ['hypothesize base', { cognitiveDemand: 'hypothesize' }, 8.0],
    [
      'conditional time frame adds 1.0',
      { cognitiveDemand: 'describe', timeFrames: ['present', 'conditional'] },
      3.0,
    ],
    [
      '3 distinct time frames adds 0.5 (explain: a describe one is floored at 3.0)',
      { cognitiveDemand: 'explain', timeFrames: ['present', 'past', 'future'] },
      4.5,
    ],
    [
      'conditional time frame + 3 distinct time frames both apply',
      { cognitiveDemand: 'describe', timeFrames: ['present', 'past', 'conditional'] },
      3.5,
    ],
    [
      'duplicate time frames do not count toward the 3-distinct bonus',
      { cognitiveDemand: 'describe', timeFrames: ['present', 'present', 'present'] },
      2.0,
    ],
    ['extended response load adds 0.75', { responseLoad: 'extended' }, 2.75],
    ['short response load subtracts 0.75', { responseLoad: 'short' }, 1.25],
    [
      'one bonus structure adds 0.25',
      { cognitiveDemand: 'justify', structures: ['subjunctive'] },
      6.25,
    ],
    [
      'three bonus structures cap at +0.75 not +0.75x3',
      {
        cognitiveDemand: 'justify',
        structures: ['subjunctive', 'conditional', 'comparison'],
      },
      6.75,
    ],
    [
      'non-bonus structures contribute nothing',
      { cognitiveDemand: 'justify', structures: ['opinion', 'negation', 'perfect'] },
      6.0,
    ],
    [
      'mixed bonus and non-bonus structures: only bonus ones count, still capped',
      {
        cognitiveDemand: 'justify',
        structures: ['opinion', 'subjunctive', 'conditional', 'comparison', 'negation'],
      },
      6.75,
    ],
    ['abstract lexical reach adds 0.25', { lexicalReach: 'abstract' }, 2.25],
    [
      'topical lexical reach adds nothing (only abstract is bonused)',
      { lexicalReach: 'topical' },
      2.0,
    ],
    [
      'F: describe + abstract maxes at 2.25 -> A1 (docs §16 example F)',
      { cognitiveDemand: 'describe', lexicalReach: 'abstract' },
      2.25,
    ],
    [
      'every additive bonus stacks before clamping',
      {
        cognitiveDemand: 'hypothesize',
        timeFrames: ['present', 'past', 'future', 'conditional'],
        structures: ['subjunctive', 'conditional', 'comparison'],
        responseLoad: 'extended',
        lexicalReach: 'abstract',
      },
      10, // 8.0 + 1.0 + 0.5 + 0.75 + 0.75 + 0.25 = 11.25, clamped to 10
    ],
    [
      'clamp floor: lowest base minus short-load penalty cannot go below 0',
      { cognitiveDemand: 'describe', responseLoad: 'short' },
      1.25,
    ],
  ])('%s', (_label, overrides, expected) => {
    expect(deriveDemandScore(demands(overrides))).toBeCloseTo(expected, 5);
  });

  it('never returns a score below 0', () => {
    const score = deriveDemandScore(
      demands({ cognitiveDemand: 'describe', responseLoad: 'short' }),
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('never returns a score above 10', () => {
    const score = deriveDemandScore(
      demands({
        cognitiveDemand: 'hypothesize',
        timeFrames: ['present', 'past', 'future', 'conditional'],
        structures: ['subjunctive', 'conditional', 'comparison'],
        responseLoad: 'extended',
        lexicalReach: 'abstract',
      }),
    );
    expect(score).toBeLessThanOrEqual(10);
  });
});

// The describe floor: the same cases the backend's Python port is tested against
// (tests/test_difficulty_context.py, DESCRIBE_FLOOR_CASES on the v7 branch).
describe('describe floor (past/future describe is at least A2)', () => {
  it.each<[string, Partial<QuestionDemands>, number, string]>([
    ['past, developed', { timeFrames: ['past'] }, 3.0, 'A2'],
    ['future, short load', { timeFrames: ['future'], responseLoad: 'short' }, 3.0, 'A2'],
    ['present + past, extended', { timeFrames: ['present', 'past'], responseLoad: 'extended' }, 3.0, 'A2'],
    [
      'three frames, extended, abstract keeps its own higher sum',
      { timeFrames: ['present', 'past', 'future'], responseLoad: 'extended', lexicalReach: 'abstract' },
      3.5,
      'A2',
    ],
    ['present only, extended: no floor', { responseLoad: 'extended' }, 2.75, 'A1'],
    ['present only, short: no floor', { responseLoad: 'short' }, 1.25, 'A1'],
  ])('%s', (_label, overrides, score, level) => {
    const d = demands(overrides);
    expect(deriveDemandScore(d)).toBeCloseTo(score, 5);
    expect(deriveDemandLevel(d)).toBe(level);
  });

  it('is exactly the A2 band edge', () => {
    expect(demandScoreToLevel(DESCRIBE_PAST_FUTURE_FLOOR)).toBe('A2');
  });

  it('applies to describe only: explain/justify keep their own base and never drop', () => {
    expect(deriveDemandScore(demands({ cognitiveDemand: 'explain', timeFrames: ['past'] }))).toBe(4.0);
    expect(deriveDemandScore(demands({ cognitiveDemand: 'justify', timeFrames: ['future'] }))).toBe(6.0);
  });
});

describe('demandScoreToLevel', () => {
  it.each<[number, string]>([
    [0, 'A1'],
    [2.99, 'A1'],
    [3.0, 'A2'],
    [4.99, 'A2'],
    [5.0, 'B1'],
    [7.49, 'B1'],
    [7.5, 'B2'],
    [10, 'B2'],
  ])('demandScore %s -> %s', (score, level) => {
    expect(demandScoreToLevel(score)).toBe(level);
  });
});

describe('deriveDemandLevel', () => {
  it('composes deriveDemandScore and demandScoreToLevel', () => {
    const d = demands({ cognitiveDemand: 'describe', lexicalReach: 'abstract' });
    expect(deriveDemandLevel(d)).toBe(demandScoreToLevel(deriveDemandScore(d)));
    expect(deriveDemandLevel(d)).toBe('A1');
  });

  it('F: an abstract-only describe question cannot cross into B1/B2 on lexical reach alone', () => {
    const d = demands({ cognitiveDemand: 'describe', lexicalReach: 'abstract' });
    expect(deriveDemandLevel(d)).toBe('A1');
  });
});

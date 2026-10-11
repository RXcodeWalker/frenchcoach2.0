import { describe, it, expect } from 'vitest';
import type { Question } from '../../../../types';
import type { QuestionDemands } from '../../demand/types';
import {
  GRAMMAR_FOCI,
  MIN_FOCUS_MATCHES,
  NO_FILTERS,
  countByGrammar,
  filterPool,
  hasActiveFilters,
  matchesFilters,
  visibleGrammarFoci,
} from '../filters';

function demands(over: Partial<QuestionDemands>): QuestionDemands {
  return {
    cognitiveDemand: 'describe',
    timeFrames: ['present'],
    structures: [],
    responseLoad: 'short',
    lexicalReach: 'everyday',
    sufficientAnswer: 'x',
    provenance: 'inferred',
    ...over,
  };
}

function q(id: string, d?: Partial<QuestionDemands>): Question {
  return {
    id, topicKey: 'school', text: id, hint: '', difficulty: 1, followUps: [], modelAnswer: '', keyVocab: [],
    demands: d ? demands(d) : undefined,
  };
}

describe('matchesFilters', () => {
  it('no filter matches everything, tagged or not', () => {
    expect(matchesFilters(q('a'), NO_FILTERS)).toBe(true);
    expect(matchesFilters(q('b', {}), NO_FILTERS)).toBe(true);
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it('an untagged question never matches a grammar filter', () => {
    for (const { id } of GRAMMAR_FOCI) {
      expect(matchesFilters(q('untagged'), { grammar: id })).toBe(false);
    }
  });

  it('past matches only a past time frame', () => {
    expect(matchesFilters(q('a', { timeFrames: ['past'] }), { grammar: 'past' })).toBe(true);
    expect(matchesFilters(q('b', { timeFrames: ['present', 'past'] }), { grammar: 'past' })).toBe(true);
    expect(matchesFilters(q('c', { timeFrames: ['present'] }), { grammar: 'past' })).toBe(false);
  });

  it('future & conditional matches either time frame', () => {
    expect(matchesFilters(q('a', { timeFrames: ['future'] }), { grammar: 'future' })).toBe(true);
    expect(matchesFilters(q('b', { timeFrames: ['conditional'] }), { grammar: 'future' })).toBe(true);
    expect(matchesFilters(q('c', { timeFrames: ['past'] }), { grammar: 'future' })).toBe(false);
  });

  it('opinions & reasons matches the opinion or justification structure', () => {
    expect(matchesFilters(q('a', { structures: ['opinion'] }), { grammar: 'opinion' })).toBe(true);
    expect(matchesFilters(q('b', { structures: ['justification'] }), { grammar: 'opinion' })).toBe(true);
    expect(matchesFilters(q('c', { structures: ['negation'] }), { grammar: 'opinion' })).toBe(false);
  });
});

describe('filterPool / counts', () => {
  const pool = [
    q('a', { timeFrames: ['past'] }),
    q('b', { timeFrames: ['present'], structures: ['opinion'] }),
    q('c'),
  ];

  it('filterPool keeps only matches and returns the same array when no filter is active', () => {
    expect(filterPool(pool, { grammar: 'past' }).map((x) => x.id)).toEqual(['a']);
    expect(filterPool(pool, NO_FILTERS)).toBe(pool);
  });

  it('countByGrammar counts per focus over tagged questions only', () => {
    expect(countByGrammar(pool)).toEqual({ present: 1, past: 1, future: 0, opinion: 1 });
  });

  it('visibleGrammarFoci offers a chip only at MIN_FOCUS_MATCHES or more', () => {
    const many = Array.from({ length: MIN_FOCUS_MATCHES }, (_, i) => q(`p${i}`, { timeFrames: ['past'] }));
    expect(visibleGrammarFoci(many)).toEqual(['past']);
    expect(visibleGrammarFoci(many.slice(1))).toEqual([]);
  });
});

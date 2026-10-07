import { describe, expect, it } from 'vitest';
import { demandPracticeCounts, earnsConfetti, practisedLine } from './sessionRecap';
import type { SessionQuestion } from '../../types';
import type { CognitiveDemand } from '../../domain/learn/demand/types';

const q = (demand: CognitiveDemand | null, status: SessionQuestion['status'] = 'completed'): SessionQuestion => ({
  question: { id: 'x', demands: demand ? { cognitiveDemand: demand } : undefined } as unknown as SessionQuestion['question'],
  status, attempts: [], bestScore: null, savedVocab: [],
});

describe('demandPracticeCounts', () => {
  it('counts completed tagged questions per demand, most-practised first', () => {
    const out = demandPracticeCounts([q('justify'), q('justify'), q('justify'), q('describe'), q('explain')]);
    expect(out).toEqual([
      { demand: 'justify', count: 3 },
      { demand: 'describe', count: 1 },
      { demand: 'explain', count: 1 },
    ]);
  });
  it('skips skipped/pending questions and untagged ones', () => {
    expect(demandPracticeCounts([q('compare', 'skipped'), q('explain', 'pending'), q(null)])).toEqual([]);
  });
});

describe('practisedLine', () => {
  it('is plain English with the count, never a raw demand id', () => {
    const line = practisedLine({ demand: 'justify', count: 3 });
    expect(line).toBe('You practised giving reasons 3×');
    for (const d of ['describe', 'explain', 'justify', 'compare', 'hypothesize'] as const) {
      expect(practisedLine({ demand: d, count: 1 })).not.toMatch(/hypothesize|justify/);
    }
  });
});

describe('earnsConfetti', () => {
  it('only for a real average of 7 or more', () => {
    expect(earnsConfetti(null)).toBe(false);
    expect(earnsConfetti(6.9)).toBe(false);
    expect(earnsConfetti(7)).toBe(true);
    expect(earnsConfetti(9.2)).toBe(true);
  });
});

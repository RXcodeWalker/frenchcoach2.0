import { describe, expect, it } from 'vitest';
import { DRILL_ROUNDS_S, DRILL_VERSION, MIN_DRILLS_FOR_TREND, firstTakeTrend, summarizeDrill, type DrillRecord, type DrillRoundResult } from '../drill432';
import { metrics } from './fixtures';

const round = (limitS: number, over = {}): DrillRoundResult => ({ limitS, stoppedEarly: false, metrics: metrics(over) });

describe('4-3-2 rounds', () => {
  it('shrinks 60 → 45 → 30 s (the 4:3:2 ratio)', () => {
    expect(DRILL_ROUNDS_S).toEqual([60, 45, 30]);
  });
});

describe('summarizeDrill', () => {
  it('compares the first and last measured rounds', () => {
    const s = summarizeDrill([
      round(60, { wordsPerMinute: 90, pauseCount: 10, speakingSpanS: 50, wordsPerRun: 5, longestPauseS: 2.5, wordCount: 75 }),
      round(45, { wordsPerMinute: 100 }),
      round(30, { wordsPerMinute: 115, pauseCount: 3, speakingSpanS: 28, wordsPerRun: 9, longestPauseS: 1, wordCount: 54 }),
    ]);
    expect(s.from).toBe(0);
    expect(s.to).toBe(2);
    expect(s.headline).toBe('smoother');
    expect(s.changes.map((c) => [c.measure, c.direction])).toEqual([
      ['wordsPerMinute', 'smoother'],
      ['pausesPerMinute', 'smoother'],
      ['wordsPerRun', 'smoother'],
      ['longestPauseS', 'smoother'],
    ]);
    expect(s.words).toEqual({ before: 75, after: 54 });
    expect(s.saidMuchLess).toBe(false);
  });

  it('flags a faster last round that said much less (speed only counts what was said)', () => {
    const s = summarizeDrill([round(60, { wordCount: 80 }), round(30, { wordCount: 30, wordsPerMinute: 130 })]);
    expect(s.saidMuchLess).toBe(true);
  });

  it('says "mixed" when some measures improve and others don’t', () => {
    const s = summarizeDrill([
      round(60, { wordsPerMinute: 90 }),
      round(30, { wordsPerMinute: 120, longestPauseS: 3 }),
    ]);
    expect(s.headline).toBe('mixed');
  });

  it('needs two measured rounds; a missing round is never a zero', () => {
    expect(summarizeDrill([round(60)]).headline).toBe('notEnough');
    expect(summarizeDrill([{ limitS: 60, stoppedEarly: false, metrics: null }, round(45)]).headline).toBe('notEnough');
  });

  it('with no words heard, compares pauses only', () => {
    const noWords = { wordCount: 0, wordsPerMinute: null, articulationWpm: null, wordsPerRun: null };
    const s = summarizeDrill([round(60, { ...noWords, pauseCount: 12, speakingSpanS: 50 }), round(30, { ...noWords, pauseCount: 2, speakingSpanS: 25 })]);
    expect(s.changes.map((c) => c.measure)).toEqual(['pausesPerMinute', 'longestPauseS']);
    expect(s.words).toBeNull();
  });

  it('ignores a round measured under another metrics version', () => {
    const s = summarizeDrill([round(60, { metricsVersion: 999 }), round(45), round(30)]);
    expect(s.from).toBe(1);
  });
});

describe('firstTakeTrend', () => {
  const drill = (i: number, wpm: number): DrillRecord => ({
    id: `d${i}`,
    at: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
    drillVersion: DRILL_VERSION,
    questionId: null,
    topicKey: 'school',
    rounds: [round(60, { wordsPerMinute: wpm }), round(45), round(30)],
  });

  it('waits for enough drills on both sides', () => {
    const few = Array.from({ length: MIN_DRILLS_FOR_TREND * 2 - 1 }, (_, i) => drill(i, 100));
    expect(firstTakeTrend(few)).toBeNull();
  });

  it('compares the first round of recent drills with earlier ones', () => {
    const drills = [80, 82, 81, 100, 102, 104].map((w, i) => drill(i, w));
    const t = firstTakeTrend(drills);
    expect(t?.drills).toBe(3);
    expect(t?.change.direction).toBe('smoother');
    expect(t?.change.before).toBe(81);
    expect(t?.change.after).toBe(102);
  });

  it('reads the 60-second round even if the record is out of order', () => {
    const d = drill(0, 100);
    d.rounds = [round(30, { wordsPerMinute: 200 }), round(60, { wordsPerMinute: 100 })];
    const drills = [d, drill(1, 100), drill(2, 100), drill(3, 100), drill(4, 100), drill(5, 100)];
    expect(firstTakeTrend(drills)?.change.direction).toBe('same');
  });
});

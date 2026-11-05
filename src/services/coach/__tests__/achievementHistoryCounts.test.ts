import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { achievementHistoryCounts } from '../achievementContextBuilder';

type Row = Parameters<typeof achievementHistoryCounts>[0][number];
const s = (over: Partial<Row> & Pick<Row, 'id' | 'mode'>): Row => ({
  topicKey: null, date: '2026-10-01T10:00:00Z', wordCount: 0, score: null, questionText: '', ...over,
});

let prevTz: string | undefined;
beforeEach(() => { prevTz = process.env.TZ; process.env.TZ = 'UTC'; });
afterEach(() => { process.env.TZ = prevTz; });

describe('achievementHistoryCounts', () => {
  it('counts distinct Learn topics only', () => {
    const c = achievementHistoryCounts([
      s({ id: '1', mode: 'practice', topicKey: 'school' }),
      s({ id: '2', mode: 'practice', topicKey: 'school' }),
      s({ id: '3', mode: 'practice', topicKey: 'food' }),
      s({ id: '4', mode: 'daily_news', topicKey: 'news' }),
      s({ id: '5', mode: 'exam' }),
    ]);
    expect(c.topicKeys.sort()).toEqual(['food', 'school']);
  });

  it('counts distinct role plays across drill cards and scenarios, not answers', () => {
    const c = achievementHistoryCounts([
      s({ id: 'story-card_a-1700000000000-0', mode: 'story' }),
      s({ id: 'story-card_a-1700000000500-1', mode: 'story' }),
      s({ id: 'story-card_b-1700000001000-0', mode: 'story' }),
      s({ id: 'roleplay-job_interview-2-1700000002000', mode: 'roleplay' }),
      s({ id: 'roleplay-job_interview-3-1700000003000', mode: 'roleplay' }),
      s({ id: 'roleplay-bakery-0-1700000004000', mode: 'roleplay' }),
    ]);
    expect(c.rolePlayKeys).toHaveLength(4);
  });

  it('counts distinct practice days, gaps allowed, and ignores modes with no speaking', () => {
    const c = achievementHistoryCounts([
      s({ id: '1', mode: 'practice', date: '2026-10-01T08:00:00Z' }),
      s({ id: '2', mode: 'practice', date: '2026-10-01T18:00:00Z' }),
      s({ id: '3', mode: 'exam', date: '2026-10-05T08:00:00Z' }),
      s({ id: '4', mode: 'rapid_fire', date: '2026-10-09T08:00:00Z' }),
    ]);
    expect(c.daysPractised).toBe(2);
  });

  it('longest answer reads single answers, never a whole exam', () => {
    const c = achievementHistoryCounts([
      s({ id: '1', mode: 'practice', wordCount: 32 }),
      s({ id: '2', mode: 'exam', wordCount: 600 }),
      s({ id: '3', mode: 'story', wordCount: 41 }),
    ]);
    expect(c.longestAnswerWords).toBe(41);
  });

  it('a repeat counts only when it beats the FIRST try by 2 points', () => {
    const q = 'Décris ta maison.';
    const base = [
      s({ id: '1', mode: 'practice', questionText: q, score: 5, date: '2026-10-01T10:00:00Z' }),
      s({ id: '2', mode: 'practice', questionText: q, score: 6, date: '2026-10-03T10:00:00Z' }),
    ];
    expect(achievementHistoryCounts(base).improvedOnRepeat).toBe(false);
    expect(achievementHistoryCounts([
      ...base, s({ id: '3', mode: 'practice', questionText: q, score: 7, date: '2026-10-08T10:00:00Z' }),
    ]).improvedOnRepeat).toBe(true);
    // A different question scoring higher is not a repeat.
    expect(achievementHistoryCounts([
      ...base, s({ id: '3', mode: 'practice', questionText: 'Autre question', score: 9 }),
    ]).improvedOnRepeat).toBe(false);
  });

  it('exam improvement compares counted Exam Sims only', () => {
    const exam = (id: string, date: string, score: number, practiceOnly = false) => s({ id, mode: 'exam', date, score, practiceOnly });
    expect(achievementHistoryCounts([
      exam('a', '2026-10-01T10:00:00Z', 6), exam('b', '2026-10-08T10:00:00Z', 7, true),
    ]).examImproved).toBe(false);
    expect(achievementHistoryCounts([
      exam('a', '2026-10-01T10:00:00Z', 6), exam('b', '2026-10-08T10:00:00Z', 6.5),
    ]).examImproved).toBe(true);
  });

  it('a return is a week or more since the day before', () => {
    const at = (id: string, date: string) => s({ id, mode: 'practice', date });
    expect(achievementHistoryCounts([at('1', '2026-10-01T10:00:00Z'), at('2', '2026-10-07T10:00:00Z')]).returnedAfterBreak).toBe(false);
    expect(achievementHistoryCounts([at('1', '2026-10-01T10:00:00Z'), at('2', '2026-10-08T10:00:00Z')]).returnedAfterBreak).toBe(true);
    expect(achievementHistoryCounts([at('1', '2026-10-08T10:00:00Z')]).returnedAfterBreak).toBe(false);
  });
});

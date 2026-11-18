import { describe, expect, it } from 'vitest';
import {
  BEST_ANSWER_MIN_SCORE,
  buildBestAnswerCard,
  buildExamCountdownCard,
  buildStreakCard,
  formatScore,
  pickBestAnswers,
  practisedDaySet,
  quoteExcerpt,
  shareCaption,
  shareFileName,
  shareLink,
  wrapText,
  type BestAnswerSession,
} from '../shareCards';

// Noon avoids any DST edge; 2026-11-18 is a Wednesday.
const NOW = new Date(2026, 10, 18, 12);

const answer = (over: Partial<BestAnswerSession> = {}): BestAnswerSession => ({
  id: 's1',
  date: new Date(2026, 10, 10, 9).toISOString(),
  mode: 'practice',
  questionText: 'Parle-moi de ta famille.',
  transcript: 'Dans ma famille, nous sommes quatre. Mon père est professeur et ma mère travaille dans un hôpital.',
  score: 8,
  wordCount: 18,
  ...over,
});

describe('shareLink', () => {
  it('carries only utm tags (the one query analytics keeps) and names the card', () => {
    const link = shareLink('streak');
    const url = new URL(link);
    expect(url.pathname).toBe('/');
    expect([...url.searchParams.keys()].sort()).toEqual(['utm_campaign', 'utm_medium', 'utm_source']);
    expect(url.searchParams.get('utm_source')).toBe('share');
    expect(url.searchParams.get('utm_campaign')).toBe('streak');
  });
});

describe('buildStreakCard', () => {
  it('is null with no streak', () => {
    expect(buildStreakCard({ streakDays: 0, practisedDays: new Set(), now: NOW })).toBeNull();
    expect(buildStreakCard({ streakDays: Number.NaN, practisedDays: new Set(), now: NOW })).toBeNull();
  });

  it('shows seven days ending today with the practised ones filled', () => {
    const sessions = [
      { date: new Date(2026, 10, 18, 8).toISOString() }, // today (Wed)
      { date: new Date(2026, 10, 17, 22).toISOString() }, // Tue
      { date: new Date(2026, 10, 15, 7).toISOString() }, // Sun
    ];
    const card = buildStreakCard({ streakDays: 2, practisedDays: practisedDaySet(sessions), now: NOW })!;
    expect(card.figure).toBe('2');
    expect(card.week).toHaveLength(7);
    expect(card.week!.map(d => d.label).join('')).toBe('TFSSMTW');
    expect(card.week!.map(d => d.practised)).toEqual([false, false, false, true, false, true, true]);
    expect(card.week!.filter(d => d.isToday)).toHaveLength(1);
    expect(card.week![6].isToday).toBe(true);
  });

  it('uses a singular label for one day and a milestone line that grows with the streak', () => {
    expect(buildStreakCard({ streakDays: 1, practisedDays: new Set(), now: NOW })!.figureLabel).toMatch(/^day of/);
    expect(buildStreakCard({ streakDays: 7, practisedDays: new Set(), now: NOW })!.lines[0]).toMatch(/week/i);
    expect(buildStreakCard({ streakDays: 31, practisedDays: new Set(), now: NOW })!.lines[0]).toMatch(/month/i);
  });
});

describe('pickBestAnswers', () => {
  it('keeps only Learn practice answers scoring at least the bar, with a real answer and question', () => {
    const picked = pickBestAnswers([
      answer({ id: 'ok' }),
      answer({ id: 'low', score: BEST_ANSWER_MIN_SCORE - 0.5 }),
      answer({ id: 'null', score: null }),
      answer({ id: 'exam', mode: 'exam' }),
      answer({ id: 'news', mode: 'daily_news' }),
      answer({ id: 'short', transcript: 'Oui, très bien.' }),
      answer({ id: 'noq', questionText: '   ' }),
    ]);
    expect(picked.map(s => s.id)).toEqual(['ok']);
  });

  it('orders by score, then newest first, and honours the limit', () => {
    const picked = pickBestAnswers([
      answer({ id: 'a', score: 8, date: '2026-11-01T10:00:00.000Z' }),
      answer({ id: 'b', score: 9.5, date: '2026-10-01T10:00:00.000Z' }),
      answer({ id: 'c', score: 8, date: '2026-11-05T10:00:00.000Z' }),
    ], 2);
    expect(picked.map(s => s.id)).toEqual(['b', 'c']);
  });
});

describe('buildBestAnswerCard', () => {
  it('quotes the learner and labels the score as exam standard', () => {
    const card = buildBestAnswerCard(answer({ score: 8.5 }))!;
    expect(card.kind).toBe('best_answer');
    expect(card.lines[0]).toBe('8.5/10 at exam standard');
    expect(card.quote).toContain('Dans ma famille');
    expect(card.question).toBe('Parle-moi de ta famille.');
  });

  it('is null without a usable score', () => {
    expect(buildBestAnswerCard(answer({ score: null }))).toBeNull();
  });
});

describe('quoteExcerpt', () => {
  it('returns a short answer untouched', () => {
    expect(quoteExcerpt('Je m’appelle Léa.')).toBe('Je m’appelle Léa.');
  });

  it('cuts at a sentence end when it can, never mid-word', () => {
    const long = `${'Mon frère aime le football. '.repeat(4)}Il joue tous les samedis avec ses amis du collège et il adore ça vraiment beaucoup.`;
    const out = quoteExcerpt(long, 90);
    expect(out.length).toBeLessThanOrEqual(90);
    expect(out.endsWith('.')).toBe(true);
    expect(long.startsWith(out)).toBe(true);
  });

  it('falls back to a word boundary and an ellipsis for one long sentence', () => {
    const sentence = `Je pense que ${'beaucoup '.repeat(40)}de choses sont importantes.`;
    const out = quoteExcerpt(sentence, 80);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.slice(0, -1).trimEnd().split(' ').every(w => w.length > 0)).toBe(true);
  });
});

describe('formatScore', () => {
  it('never shows a trailing .0', () => {
    expect(formatScore(9)).toBe('9');
    expect(formatScore(8.5)).toBe('8.5');
    expect(formatScore(7.25)).toBe('7.3');
  });
});

describe('buildExamCountdownCard', () => {
  it('is null without a date or after the exam', () => {
    expect(buildExamCountdownCard({ daysLeft: null })).toBeNull();
    expect(buildExamCountdownCard({ daysLeft: -1 })).toBeNull();
  });

  it('counts days, singular and plural, and says today on the day', () => {
    expect(buildExamCountdownCard({ daysLeft: 42 })!.figureLabel).toBe('days to go');
    expect(buildExamCountdownCard({ daysLeft: 1 })!.figureLabel).toBe('day to go');
    const today = buildExamCountdownCard({ daysLeft: 0 })!;
    expect(today.figure).toBe('Today');
    expect(today.eyebrow).toBe('Exam day');
  });

  it('adds the exam, the date and the practice count only when known', () => {
    const bare = buildExamCountdownCard({ daysLeft: 10 })!;
    expect(bare.lines).toEqual([]);
    const full = buildExamCountdownCard({ daysLeft: 10, examDate: '2027-05-12', examLabel: 'Cambridge IGCSE French · 0520', sessionsDone: 1 })!;
    expect(full.lines).toEqual([
      'Cambridge IGCSE French · 0520 speaking exam',
      '12 May 2027',
      '1 speaking session done so far',
    ]);
  });

  it('claims no grade or prediction', () => {
    const text = JSON.stringify(buildExamCountdownCard({ daysLeft: 30, sessionsDone: 12 }));
    expect(text).not.toMatch(/grade|predict|expected|on track/i);
  });
});

describe('shareCaption', () => {
  it('always ends in the tagged link for its own card', () => {
    const streak = buildStreakCard({ streakDays: 5, practisedDays: new Set(), now: NOW })!;
    const best = buildBestAnswerCard(answer())!;
    const exam = buildExamCountdownCard({ daysLeft: 12 })!;
    for (const card of [streak, best, exam]) {
      expect(shareCaption(card).endsWith(shareLink(card.kind))).toBe(true);
    }
    expect(shareCaption(streak)).toContain('5-day streak');
    expect(shareCaption(exam)).toContain('12 days to go');
  });

  it('never puts the learner’s own words in the caption', () => {
    const best = buildBestAnswerCard(answer())!;
    expect(shareCaption(best)).not.toContain('ma famille');
  });
});

describe('shareFileName', () => {
  it('is a dated png named for the card', () => {
    expect(shareFileName('best_answer', NOW)).toBe('french-coach-best-answer-2026-11-18.png');
  });
});

describe('wrapText', () => {
  const measure = (s: string) => s.length * 10;

  it('wraps greedily at word boundaries', () => {
    expect(wrapText('un deux trois quatre cinq', 100, 5, measure)).toEqual(['un deux', 'trois', 'quatre', 'cinq']);
  });

  it('puts an over-wide word on its own line instead of splitting it', () => {
    expect(wrapText('a anticonstitutionnellement b', 100, 5, measure)).toEqual(['a', 'anticonstitutionnellement', 'b']);
  });

  it('ends the last allowed line with an ellipsis that still fits', () => {
    const lines = wrapText('un deux trois quatre cinq six sept huit', 100, 2, measure);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(measure(lines[1])).toBeLessThanOrEqual(100);
  });

  it('returns nothing for empty text', () => {
    expect(wrapText('   ', 100, 3, measure)).toEqual([]);
  });
});

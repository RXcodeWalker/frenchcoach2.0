import { describe, expect, it } from 'vitest';
import { NEWS_EDITIONS } from '../../../data/news';
import { editionForDay, recentDays } from '../../../data/news/rotation';
import { defaultNewsLevel, earnsXp, newsContentId, newsDays, newsScore, newsStreak } from '../newsProgress';

const done = (day: string) => ({ mode: 'daily_news', contentId: newsContentId(editionForDay(day, NEWS_EDITIONS).id, day) });

describe('newsProgress', () => {
  it('earns XP only for the first report on an edition-day', () => {
    const id = newsContentId('bees-on-roofs', '2026-11-11');
    expect(earnsXp([], id)).toBe(true);
    expect(earnsXp([{ mode: 'daily_news', contentId: id }], id)).toBe(false);
    // Same story on another day of the rotation is new news.
    expect(earnsXp([{ mode: 'daily_news', contentId: id }], newsContentId('bees-on-roofs', '2026-12-05'))).toBe(true);
    expect(earnsXp([{ mode: 'practice', contentId: id }], id)).toBe(true);
  });

  it('counts the streak back from today, and a not-yet-done today does not break it', () => {
    const [today, d1, d2, d3] = recentDays('2026-11-11', 4);
    expect(newsStreak([done(d1), done(d2)], today, NEWS_EDITIONS)).toBe(2);
    expect(newsStreak([done(today), done(d1), done(d2)], today, NEWS_EDITIONS)).toBe(3);
    expect(newsStreak([done(d2), done(d3)], today, NEWS_EDITIONS)).toBe(0);
  });

  it('a replay of an old edition on a later day does not count for that later day', () => {
    const [today, yesterday] = recentDays('2026-11-11', 2);
    const replay = { mode: 'daily_news', contentId: newsContentId(editionForDay(yesterday, NEWS_EDITIONS).id, yesterday) };
    expect(newsStreak([replay], today, NEWS_EDITIONS)).toBe(1);
    expect(newsDays([replay], today, NEWS_EDITIONS, 2).map(d => d.done)).toEqual([true, false]);
  });

  it('maps marking levels to story levels', () => {
    expect(defaultNewsLevel('A1')).toBe('a2');
    expect(defaultNewsLevel('A2')).toBe('a2');
    expect(defaultNewsLevel('exam')).toBe('b1');
    expect(defaultNewsLevel('B1')).toBe('b1');
    expect(defaultNewsLevel('B2')).toBe('b2');
  });

  it('scores half listening, half facts', () => {
    expect(newsScore(3, 3, 4, 4)).toBe(10);
    expect(newsScore(0, 3, 0, 4)).toBe(0);
    expect(newsScore(3, 3, 2, 4)).toBe(7.5);
  });
});

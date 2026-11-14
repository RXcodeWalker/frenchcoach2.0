import { describe, expect, it } from 'vitest';
import { NEWS_EDITIONS } from '../../../data/news';
import { editionForDay, recentDays } from '../../../data/news/rotation';
import { defaultNewsLevel, earnsXp, finishedDays, newsContentId, newsDays, newsStreak } from '../newsProgress';

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
    expect(newsStreak([done(d1), done(d2)], today)).toBe(2);
    expect(newsStreak([done(today), done(d1), done(d2)], today)).toBe(3);
    expect(newsStreak([done(d2), done(d3)], today)).toBe(0);
  });

  it('a replay of an old edition on a later day does not count for that later day', () => {
    const [today, yesterday] = recentDays('2026-11-11', 2);
    const replay = { mode: 'daily_news', contentId: newsContentId(editionForDay(yesterday, NEWS_EDITIONS).id, yesterday) };
    expect(newsStreak([replay], today)).toBe(1);
    expect(newsDays([replay], today, NEWS_EDITIONS, 2).map(d => d.done)).toEqual([true, false]);
  });

  it('maps marking levels to story levels', () => {
    expect(defaultNewsLevel('A1')).toBe('a2');
    expect(defaultNewsLevel('A2')).toBe('a2');
    expect(defaultNewsLevel('exam')).toBe('b1');
    expect(defaultNewsLevel('B1')).toBe('b1');
    expect(defaultNewsLevel('B2')).toBe('b2');
  });

  it('keys finished days on the day, so adding an edition never takes a tick away', () => {
    const history = [
      { mode: 'daily_news', contentId: newsContentId('an-edition-later-moved', '2026-11-09') },
      { mode: 'daily_news', contentId: newsContentId('bees-on-roofs', '2026-11-10') },
      { mode: 'daily_news', contentId: 'news-quiz:2026-11-08' },
      { mode: 'practice', contentId: newsContentId('bees-on-roofs', '2026-11-07') },
    ];
    expect([...finishedDays(history)].sort()).toEqual(['2026-11-09', '2026-11-10']);
    expect(newsStreak(history, '2026-11-11')).toBe(2);
    expect(newsDays(history, '2026-11-11', NEWS_EDITIONS, 3).map(d => d.done)).toEqual([true, true, false]);
  });

  it('an archive catch-up ticks its day but never mends the streak', () => {
    const catchUp = { mode: 'daily_news', contentId: newsContentId('bees-on-roofs', '2026-11-10'), date: '2026-11-11T09:00:00' };
    const onTime = { mode: 'daily_news', contentId: newsContentId('solar-boat', '2026-11-11'), date: '2026-11-11T10:00:00' };
    expect(newsStreak([catchUp, onTime], '2026-11-11')).toBe(1);
    expect(newsDays([catchUp, onTime], '2026-11-11', NEWS_EDITIONS, 2).map(d => d.done)).toEqual([true, true]);
  });
});

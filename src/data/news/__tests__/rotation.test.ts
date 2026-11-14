import { describe, expect, it } from 'vitest';
import { NEWS_EDITIONS } from '..';
import { dayNumber, editionForDay, recentDays } from '../rotation';

describe('news rotation', () => {
  it('gives the same edition for the same day and a different one the next day', () => {
    const a = editionForDay('2026-11-11', NEWS_EDITIONS);
    expect(editionForDay('2026-11-11', NEWS_EDITIONS).id).toBe(a.id);
    expect(editionForDay('2026-11-12', NEWS_EDITIONS).id).not.toBe(a.id);
  });

  it('runs a pinned edition on its calendar day every year', () => {
    expect(editionForDay('2027-06-21', NEWS_EDITIONS).id).toBe('music-day');
    expect(editionForDay('2031-07-14', NEWS_EDITIONS).id).toBe('bastille-day');
    expect(editionForDay('2028-02-02', NEWS_EDITIONS).id).toBe('candlemas-crepes');
  });

  it('never picks a pinned edition on another day', () => {
    const pinned = new Set(NEWS_EDITIONS.filter(e => e.pinDate).map(e => e.id));
    for (const day of recentDays('2026-12-31', 200)) {
      const e = editionForDay(day, NEWS_EDITIONS);
      if (e.pinDate) expect(day.slice(5)).toBe(e.pinDate);
      else expect(pinned.has(e.id)).toBe(false);
    }
  });

  it('does not repeat a story within the length of the rotation', () => {
    const pool = NEWS_EDITIONS.filter(e => !e.pinDate).length;
    const days = recentDays('2026-10-31', pool); // no pinned day in this window
    expect(new Set(days.map(d => editionForDay(d, NEWS_EDITIONS).id)).size).toBe(pool);
  });

  it('counts days without timezone drift and lists recent days newest first', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(recentDays('2026-03-01', 3)).toEqual(['2026-03-01', '2026-02-28', '2026-02-27']);
  });
});

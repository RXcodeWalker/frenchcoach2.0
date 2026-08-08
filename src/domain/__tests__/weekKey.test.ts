import { describe, it, expect } from 'vitest';
import { getWeekKey } from '../weekKey';

describe('getWeekKey', () => {
  it('mid-year date lands in the expected ISO week', () => {
    // 2026-08-08 is a Saturday. ISO week containing it: Mon 2026-08-03..Sun 2026-08-09 = week 32.
    expect(getWeekKey(new Date('2026-08-08T12:00:00Z'))).toBe('2026-W32');
  });

  it('Monday and Sunday of the same ISO week agree', () => {
    expect(getWeekKey(new Date('2026-08-03T00:00:00Z'))).toBe('2026-W32');
    expect(getWeekKey(new Date('2026-08-09T23:59:59Z'))).toBe('2026-W32');
  });

  // ── Year boundary: 2020-12-31 (Thu) and 2021-01-01 (Fri) are both ISO
  // week 2020-W53 — the ISO year does not follow the calendar year here.
  it('year boundary: Dec 31 2020 is week 2020-W53', () => {
    expect(getWeekKey(new Date('2020-12-31T12:00:00Z'))).toBe('2020-W53');
  });

  it('year boundary: Jan 1 2021 is still week 2020-W53', () => {
    expect(getWeekKey(new Date('2021-01-01T12:00:00Z'))).toBe('2020-W53');
  });

  it('year boundary: Jan 4 2021 (Mon) starts 2021-W01', () => {
    expect(getWeekKey(new Date('2021-01-04T12:00:00Z'))).toBe('2021-W01');
  });

  // ── ISO week 53 exists only in years whose Jan 1 (non-leap) is a Thursday,
  // or Jan 1 (leap year) is a Wednesday or Thursday. 2015 is such a year.
  it('ISO week 53: Dec 31 2015 is week 2015-W53', () => {
    expect(getWeekKey(new Date('2015-12-31T12:00:00Z'))).toBe('2015-W53');
  });

  it('ISO week 1: Jan 1 2024 (Mon) is week 2024-W01', () => {
    expect(getWeekKey(new Date('2024-01-01T00:00:00Z'))).toBe('2024-W01');
  });

  it('a year with no week 53 rolls Dec 29 into W01 of the next ISO year', () => {
    // 2022-01-01 is a Saturday; the ISO year 2021 has no week 53, so
    // 2021-12-31 (Fri) belongs to 2021-W52 and 2022-01-03 (Mon) starts 2022-W01.
    expect(getWeekKey(new Date('2021-12-31T12:00:00Z'))).toBe('2021-W52');
    expect(getWeekKey(new Date('2022-01-03T12:00:00Z'))).toBe('2022-W01');
  });

  // ── UTC±14 offsets: getWeekKey must key off UTC fields, not local wall
  // clock, so a Date representing the same UTC instant always yields the
  // same key regardless of what timezone constructed it.
  it('is timezone-independent: UTC+14 instant matches its UTC calendar day', () => {
    // 2026-01-01T02:00:00+14:00 is 2025-12-31T12:00:00Z.
    const viaOffset = new Date('2026-01-01T02:00:00+14:00');
    const viaUTC = new Date('2025-12-31T12:00:00Z');
    expect(viaOffset.getTime()).toBe(viaUTC.getTime());
    expect(getWeekKey(viaOffset)).toBe(getWeekKey(viaUTC));
  });

  it('is timezone-independent: UTC-12 instant matches its UTC calendar day', () => {
    // 2026-08-09T23:00:00-12:00 is 2026-08-10T11:00:00Z (next UTC day, new ISO week).
    const viaOffset = new Date('2026-08-09T23:00:00-12:00');
    expect(getWeekKey(viaOffset)).toBe('2026-W33');
  });

  it('defaults to the current date when called with no argument', () => {
    expect(() => getWeekKey()).not.toThrow();
    expect(getWeekKey()).toMatch(/^\d{4}-W\d{2}$/);
  });
});

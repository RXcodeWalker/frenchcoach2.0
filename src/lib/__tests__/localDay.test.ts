// A "day" is the learner's local calendar day (owner, 2026-11-04).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { localDay, localDayBefore, localDayOf } from '../localDay';

const originalTz = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Asia/Kolkata'; });
afterAll(() => { process.env.TZ = originalTz; vi.useRealTimers(); });

describe('localDay in India (UTC+05:30)', () => {
  it('a 1 a.m. IST session counts for that day, not the UTC day before', () => {
    // 2026-11-04 01:00 IST = 2026-11-03 19:30 UTC
    expect(localDayOf('2026-11-03T19:30:00.000Z')).toBe('2026-11-04');
  });

  it('the day turns at local midnight', () => {
    expect(localDayOf('2026-11-03T18:29:00.000Z')).toBe('2026-11-03'); // 23:59 IST
    expect(localDayOf('2026-11-03T18:30:00.000Z')).toBe('2026-11-04'); // 00:00 IST
  });

  it('yesterday is calendar arithmetic', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T19:30:00.000Z'));
    expect(localDay()).toBe('2026-11-04');
    expect(localDayBefore(1)).toBe('2026-11-03');
    expect(localDayBefore(4)).toBe('2026-10-31');
    vi.useRealTimers();
  });

  it('an unparseable timestamp is no day', () => {
    expect(localDayOf('nope')).toBe('');
  });
});

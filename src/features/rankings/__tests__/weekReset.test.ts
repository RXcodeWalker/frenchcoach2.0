import { describe, expect, it } from 'vitest';
import { weekResetsIn } from '../weekReset';

describe('weekResetsIn', () => {
  it('counts to the next UTC Monday', () => {
    expect(weekResetsIn(new Date('2026-10-28T12:00:00Z'))).toBe('4d 12h'); // Wed noon → Mon 00:00
  });
  it('a Monday waits a full week', () => {
    expect(weekResetsIn(new Date('2026-10-26T00:00:00Z'))).toBe('7d 0h');
  });
  it('on Sunday evening shows hours and minutes', () => {
    expect(weekResetsIn(new Date('2026-11-01T22:30:00Z'))).toBe('1h 30m');
  });
});

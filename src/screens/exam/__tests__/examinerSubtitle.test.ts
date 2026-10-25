import { describe, expect, it } from 'vitest';
import { examinerSubtitle } from '../examinerSubtitle';

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m);

describe('examinerSubtitle', () => {
  it('says "today" from 05:00 to 17:59', () => {
    expect(examinerSubtitle(at(5))).toBe('your examiner today');
    expect(examinerSubtitle(at(12))).toBe('your examiner today');
    expect(examinerSubtitle(at(17, 59))).toBe('your examiner today');
  });

  it('says "tonight" from 18:00 to 04:59', () => {
    expect(examinerSubtitle(at(18))).toBe('your examiner tonight');
    expect(examinerSubtitle(at(23, 30))).toBe('your examiner tonight');
    expect(examinerSubtitle(at(0))).toBe('your examiner tonight');
    expect(examinerSubtitle(at(4, 59))).toBe('your examiner tonight');
  });
});

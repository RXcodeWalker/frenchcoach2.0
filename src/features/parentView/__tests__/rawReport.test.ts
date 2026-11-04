import { describe, expect, it } from 'vitest';
import { parseRawReport } from '../rawReport';

describe('parseRawReport', () => {
  it('returns null for anything that is not a report', () => {
    expect(parseRawReport(null)).toBeNull();
    expect(parseRawReport({ sessions: [] })).toBeNull();
    expect(parseRawReport([])).toBeNull();
  });

  it('drops malformed rows and reads Postgres numerics sent as strings', () => {
    const r = parseRawReport({
      learnerName: '  ',
      linkLabel: 'Dad',
      generatedAt: '2026-11-04T10:00:00Z',
      sessions: [
        { at: 'not a date', mode: 'practice' },
        { at: '2026-11-03T10:00:00Z', mode: 'practice', score: '6.50', durationSec: 120, words: 30, topic: 'school' },
        { at: '2026-11-02T10:00:00Z', mode: 'exam', score: 7.5, exam: { practiceOnly: false, marks: { total: 30 } } },
      ],
      speaking: [{ at: '2026-11-03T10:00:00Z', wpm: 88, pausesOver2s: 1 }, 'junk'],
    });
    expect(r?.learnerName).toBeNull();
    expect(r?.sessions).toHaveLength(2);
    expect(r?.sessions[0].score).toBe(6.5);
    // Incomplete marks are dropped, the condition is kept.
    expect(r?.sessions[1].exam).toEqual({ practiceOnly: false, marks: null });
    expect(r?.speaking).toHaveLength(1);
  });
});

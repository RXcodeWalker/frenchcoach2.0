import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({ supabase: {}, supabaseConfigured: false }));

import { withExamSummary } from '../sessionSync';
import type { Session } from '../../../types';

const base: Session = { id: 's', mode: 'exam', wordCount: 100, score: 7.5, xpEarned: 0, durationSec: 600, createdAt: '2026-11-04T10:00:00Z' };

describe('withExamSummary (parent view reads it from the cloud row)', () => {
  it('adds the exam condition and area marks to an exam row', () => {
    const marks = { rolePlay: 8, rolePlayMax: 10, communication: 11, qualityOfLanguage: 11, total: 30 };
    expect(withExamSummary(null, { ...base, practiceOnly: false, examMarks: marks })).toEqual({ exam: { practiceOnly: false, marks } });
    expect(withExamSummary(null, { ...base, practiceOnly: true })).toEqual({ exam: { practiceOnly: true, marks: null } });
  });

  it('leaves non-exam rows untouched', () => {
    expect(withExamSummary({ cefrLevel: 'A2' }, { ...base, mode: 'practice' })).toEqual({ cefrLevel: 'A2' });
    expect(withExamSummary(null, { ...base, mode: 'practice' })).toBeNull();
  });
});

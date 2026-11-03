// @vitest-environment jsdom
// Teacher dashboard Stage 0: the exam fields that used to be local-only now reach
// the `sessions` row, and a row without them omits the keys entirely (so a Learn
// answer still syncs against a schema that lacks the new columns).
import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsertMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...args: unknown[]) => upsertMock(...args) }) },
  supabaseConfigured: true,
}));

import { pushSessionToCloud } from '../sessionSync';
import type { Session } from '../../../types';

beforeEach(() => {
  localStorage.clear();
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

const base: Session = { id: 's-1', mode: 'exam', wordCount: 120, score: 6.8, xpEarned: 10, durationSec: 300, createdAt: '2026-11-03T10:00:00.000Z' };

describe('sessionToRow teacher fields', () => {
  it('sends practice_only, exam_marks, scoring_session_id and assignment_id when set', async () => {
    await pushSessionToCloud('user-1', {
      ...base,
      practiceOnly: false,
      examMarks: { rolePlay: 8, rolePlayMax: 10, communication: 10, qualityOfLanguage: 9, total: 27 },
      scoringSessionId: 'exam-abc',
      assignmentId: '6f1c1d0e-3b0a-4c39-9d43-6a6f3a0e2b11',
    });
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect(row.practice_only).toBe(false);
    expect(row.exam_marks).toEqual({ rolePlay: 8, rolePlayMax: 10, communication: 10, qualityOfLanguage: 9, total: 27 });
    expect(row.scoring_session_id).toBe('exam-abc');
    expect(row.assignment_id).toBe('6f1c1d0e-3b0a-4c39-9d43-6a6f3a0e2b11');
  });

  it('omits the keys for a session that has none of them', async () => {
    await pushSessionToCloud('user-1', { ...base, mode: 'practice' });
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    for (const key of ['practice_only', 'exam_marks', 'scoring_session_id', 'assignment_id']) {
      expect(row).not.toHaveProperty(key);
    }
  });
});

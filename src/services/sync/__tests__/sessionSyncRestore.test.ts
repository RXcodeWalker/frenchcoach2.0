// @vitest-environment jsdom
// Cloud restore gaps: exam fields (practiceOnly, examMarks, scoringSessionId)
// survive a round trip through `sessions`, older-than-90-day history comes back,
// and hydration no longer resets the device's streak.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsertMock = vi.fn();
const updateMock = vi.fn();
const selectMock = vi.fn();
const limitMock = vi.fn();

vi.mock('../../../lib/supabase', () => {
  const selectChain = {
    eq: () => selectChain,
    order: () => selectChain,
    limit: (n: number) => limitMock(n),
  };
  const updateChain = (patch: unknown) => {
    const chain = { eq: (col: string, val: unknown) => { updateMock(patch, col, val); return chain; }, then: (r: (v: unknown) => void) => r({ error: null }) };
    return chain;
  };
  return {
    supabase: {
      from: () => ({
        upsert: (...args: unknown[]) => upsertMock(...args),
        update: updateChain,
        select: (cols: string) => { selectMock(cols); return selectChain; },
      }),
    },
    supabaseConfigured: true,
  };
});

import {
  pushSessionToCloud,
  pullSessionsFromCloud,
  hydrateSessionsFromCloud,
  mergeSessionLists,
  mergeStreak,
  streakFromSessions,
  backfillSessionsToCloud,
  repairCloudExamFields,
  type StoredSession,
} from '../sessionSync';
import { STORAGE_KEYS, storageGet, storageSet } from '../../persistence/storage';
import type { Session } from '../../../types';

const MARKS = { rolePlay: 8, rolePlayMax: 10, communication: 10, qualityOfLanguage: 9, total: 27 };

function day(offset: number): string {
  return new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
}

function stored(id: string, date: string, overrides: Partial<StoredSession> = {}): StoredSession {
  return { id, date, mode: 'practice', topicKey: 'school', questionText: 'Q', transcript: 'T', wordCount: 4, score: 7, durationSec: 30, ...overrides };
}

function cloudRow(id: string, createdAt: string, extra: Record<string, unknown> = {}) {
  return {
    id, user_id: 'u1', mode: 'exam', topic_key: null, question_text: 'Q', transcript: 'T', word_count: 100,
    score: 6.8, xp_earned: 10, duration_sec: 600, feedback: null, created_at: createdAt, ...extra,
  };
}

beforeEach(() => {
  localStorage.clear();
  upsertMock.mockReset().mockResolvedValue({ error: null });
  updateMock.mockReset();
  selectMock.mockReset();
  limitMock.mockReset().mockResolvedValue({ data: [], error: null });
});

describe('exam fields reach the cloud row', () => {
  const base: Session = { id: 's-1', mode: 'exam', wordCount: 120, score: 6.8, xpEarned: 10, durationSec: 300, createdAt: '2026-11-03T10:00:00.000Z' };

  it('pushes practice_only, exam_marks and scoring_session_id', async () => {
    await pushSessionToCloud('u1', { ...base, practiceOnly: true, examMarks: MARKS, scoringSessionId: 'exam-abc' });
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect(row.practice_only).toBe(true);
    expect(row.exam_marks).toEqual(MARKS);
    expect(row.scoring_session_id).toBe('exam-abc');
  });

  it('a Learn answer carries none of the exam keys', async () => {
    await pushSessionToCloud('u1', { ...base, mode: 'practice' });
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    for (const key of ['practice_only', 'exam_marks', 'scoring_session_id']) expect(row).not.toHaveProperty(key);
  });

  it('keeps practice_only=false (a counted Exam Sim), not just true', async () => {
    await pushSessionToCloud('u1', { ...base, practiceOnly: false });
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect(row.practice_only).toBe(false);
  });

  it('resends without the exam columns when the database lacks them', async () => {
    upsertMock
      .mockResolvedValueOnce({ error: { message: "Could not find the 'practice_only' column of 'sessions' in the schema cache" } })
      .mockResolvedValueOnce({ error: null });
    expect(await pushSessionToCloud('u1', { ...base, practiceOnly: true })).toBe(true);
    const [retry] = upsertMock.mock.calls[1] as [Record<string, unknown>];
    expect(retry).not.toHaveProperty('practice_only');
  });

  it('backfill and the offline queue send them too', async () => {
    await backfillSessionsToCloud('u1', [stored('s-2', '2026-11-01', { mode: 'exam', practiceOnly: false, examMarks: MARKS, scoringSessionId: 'exam-2' })], new Set());
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect(row.practice_only).toBe(false);
    expect(row.exam_marks).toEqual(MARKS);
    expect(row.scoring_session_id).toBe('exam-2');
  });
});

describe('restoring from the cloud', () => {
  it('reads the exam fields back', async () => {
    limitMock.mockResolvedValueOnce({ data: [cloudRow('s-1', '2026-11-02T10:00:00Z', { practice_only: true, exam_marks: MARKS, scoring_session_id: 'exam-1' })], error: null });
    const [s] = (await pullSessionsFromCloud('u1'))!;
    expect(s.practiceOnly).toBe(true);
    expect(s.examMarks).toEqual(MARKS);
    expect(s.scoringSessionId).toBe('exam-1');
  });

  it('leaves the fields undefined (not false) when the row has none, and drops malformed marks', async () => {
    limitMock.mockResolvedValueOnce({ data: [cloudRow('s-1', '2026-11-02T10:00:00Z', { practice_only: null, exam_marks: { total: 'x' } })], error: null });
    const [s] = (await pullSessionsFromCloud('u1'))!;
    expect(s).not.toHaveProperty('practiceOnly');
    expect(s).not.toHaveProperty('examMarks');
  });

  it('asks for the newest rows of any age and returns them oldest first', async () => {
    limitMock.mockResolvedValueOnce({ data: [cloudRow('new', '2026-11-02T10:00:00Z'), cloudRow('old', '2025-01-01T10:00:00Z')], error: null });
    const rows = (await pullSessionsFromCloud('u1'))!;
    expect(limitMock).toHaveBeenCalledWith(500);
    expect(rows.map(r => r.id)).toEqual(['old', 'new']);
  });

  it('falls back to the base columns when the exam columns do not exist', async () => {
    limitMock
      .mockResolvedValueOnce({ data: null, error: { message: 'column sessions.practice_only does not exist', code: '42703' } })
      .mockResolvedValueOnce({ data: [cloudRow('s-1', '2026-11-02T10:00:00Z')], error: null });
    const rows = await pullSessionsFromCloud('u1');
    expect(rows).toHaveLength(1);
    expect(selectMock.mock.calls[1][0]).not.toContain('practice_only');
  });

  it('a local copy missing exam marks is filled from the cloud copy; local values still win', () => {
    const local = stored('s-1', '2026-11-02', { mode: 'exam', score: 5 });
    const cloud = stored('s-1', '2026-11-02', { mode: 'exam', score: 9, practiceOnly: true, examMarks: MARKS });
    const [m] = mergeSessionLists([local], [cloud]);
    expect(m.score).toBe(5);
    expect(m.practiceOnly).toBe(true);
    expect(m.examMarks).toEqual(MARKS);
  });

  it('a restored Coached attempt stays practice-only after hydration', async () => {
    limitMock.mockResolvedValueOnce({ data: [cloudRow('s-1', '2026-11-02T10:00:00Z', { practice_only: true, exam_marks: MARKS })], error: null });
    const { mergedSessions } = await hydrateSessionsFromCloud('u1');
    expect(mergedSessions[0].practiceOnly).toBe(true);
    const saved = storageGet<{ sessions: StoredSession[] }>(STORAGE_KEYS.analytics, { sessions: [] });
    expect(saved.sessions[0].examMarks).toEqual(MARKS);
  });
});

describe('repairing exam rows pushed before the fields synced', () => {
  it('updates only the exam columns of a cloud row that lacks them', async () => {
    const local = [stored('s-1', '2026-11-02', { mode: 'exam', practiceOnly: false, examMarks: MARKS })];
    const cloud = [stored('s-1', '2026-11-02', { mode: 'exam' })];
    expect(await repairCloudExamFields('u1', local, cloud)).toBe(1);
    const [patch] = updateMock.mock.calls[0] as [Record<string, unknown>];
    expect(patch).toEqual({ practice_only: false, exam_marks: MARKS });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('leaves rows alone when the cloud already has the fields, or the session is not an exam', async () => {
    const local = [stored('s-1', '2026-11-02', { mode: 'exam', practiceOnly: true }), stored('s-2', '2026-11-02')];
    const cloud = [stored('s-1', '2026-11-02', { mode: 'exam', practiceOnly: true }), stored('s-2', '2026-11-02')];
    expect(await repairCloudExamFields('u1', local, cloud)).toBe(0);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('streak on hydration', () => {
  it('a streak not yet extended today is still alive (was reset to 0)', () => {
    const sessions = [stored('a', `${day(3)}T10:00:00Z`), stored('b', `${day(2)}T10:00:00Z`), stored('c', `${day(1)}T10:00:00Z`)];
    expect(streakFromSessions(sessions)).toEqual({ count: 3, lastDate: day(1) });
  });

  it('a run that ended before yesterday proves nothing', () => {
    expect(streakFromSessions([stored('a', `${day(3)}T10:00:00Z`)])).toEqual({ count: 0, lastDate: null });
  });

  it("keeps this device's streak (a Streak Freeze gap the history cannot see)", () => {
    const local = { count: 10, lastDate: day(1) };
    const sessions = [stored('a', `${day(1)}T10:00:00Z`)];
    expect(mergeStreak(local, sessions)).toEqual(local);
  });

  it('a fresh device takes the streak the restored history proves', () => {
    const sessions = [stored('a', `${day(1)}T10:00:00Z`), stored('b', `${day(0)}T10:00:00Z`)];
    expect(mergeStreak({ count: 0, lastDate: null }, sessions)).toMatchObject({ count: 2, lastDate: day(0) });
  });

  it('takes the history when another device practised more recently', () => {
    const sessions = [stored('a', `${day(2)}T10:00:00Z`), stored('b', `${day(1)}T10:00:00Z`)];
    expect(mergeStreak({ count: 1, lastDate: day(2) }, sessions)).toMatchObject({ count: 2, lastDate: day(1) });
  });

  it('hydration no longer stamps lastDate=today or lowers the count', async () => {
    storageSet(STORAGE_KEYS.analytics, {
      sessions: [stored('a', `${day(1)}T10:00:00Z`)], totalWords: 900,
      streak: { count: 6, lastDate: day(1) }, challengeLog: {},
    });
    await hydrateSessionsFromCloud('u1');
    const saved = storageGet<{ streak: { count: number; lastDate: string }; totalWords: number }>(STORAGE_KEYS.analytics, { streak: { count: 0, lastDate: '' }, totalWords: 0 });
    expect(saved.streak).toEqual({ count: 6, lastDate: day(1) });
    expect(saved.totalWords).toBe(900);
  });
});

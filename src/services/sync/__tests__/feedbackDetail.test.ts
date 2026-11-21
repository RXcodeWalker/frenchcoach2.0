// @vitest-environment jsdom
// sessions.feedback_detail: the full feedback the learner saw reaches its own column
// (never the `feedback` summary the teacher/parent readers see), without the
// marking-ladder data, size-capped, and an upsert rebuilt from the stored summary
// never sends (and so never blanks) it.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsertMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...args: unknown[]) => upsertMock(...args) }) },
  supabaseConfigured: true,
}));

import { pushSessionToCloud, flushPendingQueue } from '../sessionSync';
import { buildFeedbackDetail, FEEDBACK_DETAIL_MAX_BYTES, FEEDBACK_DETAIL_VERSION } from '../feedbackDetail';
import { STORAGE_KEYS, storageSet } from '../../persistence/storage';
import type { FeedbackV2, Session } from '../../../types';

const feedback = {
  scores: { communication: 6, language: 5, accuracy: 5, fluency: 6, overall: 5.5 },
  grammar: {
    critical: [{ theme: 'agreement', severity: 'major', msg: '« les film » → « les films »', diagnostic: 'Plural noun needs -s.', correction: 'les films' }],
    polish: [],
  },
  vocabulary: [{ basic: 'bien', upgrade: 'génial' }],
  style: [],
  fillers: [],
  wordCount: 9,
  cefrLevel: 'A2',
  encouragement: 'You said « j\'aime les film » — a clear opinion.',
  improved_answer: "J'aime les films parce qu'ils sont drôles.",
  issues: [{ id: 'i1', quote: 'les film', correction: 'les films' }],
  gradedTranscript: "j'aime les film parce que ils sont drôle",
  biggest_opportunity: 'Add -s to plural nouns.',
  promptVersion: 'learn-prompt-v11',
  engineMeta: { requestedEngine: 'groq', actualEngine: 'groq', fallbackUsed: false, latencyMs: 2100, evaluatedAt: '2026-11-21T09:00:00Z' },
  providerAttempts: [{ provider: 'groq', success: false, error: 'upstream said something' }],
  changes: [{ quote: 'x', category: 'grammar', explanation: 'render-only' }],
  levelCheck: { levels: { exam: {} } },
  markingVersion: 'ladder-v1',
} as unknown as FeedbackV2;

const session: Session = {
  id: 's-learn-1', mode: 'practice', topicKey: 'free_time', questionId: 'fre_12',
  questionText: 'Qu\'est-ce que tu aimes faire ?', transcript: "j'aime les film parce que ils sont drôle",
  wordCount: 9, score: 5.5, xpEarned: 12, durationSec: 30, feedback, createdAt: '2026-11-21T09:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

describe('buildFeedbackDetail', () => {
  it('keeps the corrections, quotes and improved answer the learner saw, with the question id', () => {
    const d = buildFeedbackDetail(session)!;
    expect(d.v).toBe(FEEDBACK_DETAIL_VERSION);
    expect(d.questionId).toBe('fre_12');
    expect(d.improved_answer).toBe(feedback.improved_answer);
    expect(d.grammar).toEqual(feedback.grammar);
    expect(d.issues).toEqual(feedback.issues);
    expect(d.encouragement).toBe(feedback.encouragement);
    expect(d.gradedTranscript).toBe(feedback.gradedTranscript);
    expect(d.promptVersion).toBe('learn-prompt-v11');
    expect(d.engine).toEqual({ requested: 'groq', actual: 'groq', fallbackUsed: false, latencyMs: 2100 });
  });

  it('never carries the marking ladder, render-only changes or raw provider errors', () => {
    const d = buildFeedbackDetail(session)!;
    expect(d).not.toHaveProperty('levelCheck');
    expect(d).not.toHaveProperty('changes');
    expect(d).not.toHaveProperty('providerAttempts');
    expect(JSON.stringify(d)).not.toContain('upstream said something');
  });

  it('is null without feedback', () => {
    expect(buildFeedbackDetail({ feedback: undefined })).toBeNull();
  });

  it('stays under the cap, dropping the least useful fields first and saying so', () => {
    const big = {
      ...feedback,
      vocabularyV2: Array.from({ length: 30 }, (_, i) => ({ word: `w${i}`, note: 'x'.repeat(1500) })),
      transcriptAnnotations: Array.from({ length: 30 }, () => ({ text: 'y'.repeat(1500) })),
    } as unknown as FeedbackV2;
    const d = buildFeedbackDetail({ ...session, feedback: big })!;
    expect(new TextEncoder().encode(JSON.stringify(d)).length).toBeLessThanOrEqual(FEEDBACK_DETAIL_MAX_BYTES);
    expect(d.dropped).toEqual(expect.arrayContaining(['transcriptAnnotations', 'vocabularyV2']));
    expect(d.improved_answer).toBe(feedback.improved_answer);
    expect(d.grammar).toEqual(feedback.grammar);
  });

  it('falls back to the corrections alone when every field is huge', () => {
    // demands_met is not on the drop list, so only the last-resort path can shrink it.
    const huge = { demands_met: Array.from({ length: 30 }, () => 'z'.repeat(5000)) };
    const d = buildFeedbackDetail({ ...session, feedback: { ...feedback, ...huge } as FeedbackV2 })!;
    expect(new TextEncoder().encode(JSON.stringify(d)).length).toBeLessThanOrEqual(FEEDBACK_DETAIL_MAX_BYTES);
    expect(d.dropped).toEqual(['*']);
    expect(d.grammar).toEqual(feedback.grammar);
  });
});

describe('sessions row', () => {
  it('puts the detail in feedback_detail and leaves the feedback summary as it was', async () => {
    await pushSessionToCloud('user-1', session);
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect((row.feedback_detail as Record<string, unknown>).improved_answer).toBe(feedback.improved_answer);
    // The summary the teacher/parent readers see gains nothing.
    expect(Object.keys(row.feedback as object).sort()).toEqual(
      ['biggest_opportunity', 'cefrLevel', 'critical_count', 'markingVersion', 'scores'].sort(),
    );
  });

  it('a session without feedback sends no feedback_detail key', async () => {
    await pushSessionToCloud('user-1', { ...session, id: 's-2', feedback: undefined });
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect(row).not.toHaveProperty('feedback_detail');
  });

  it('resends without feedback_detail only — keeping the exam fields — when the column is missing', async () => {
    upsertMock
      .mockResolvedValueOnce({ error: { message: "Could not find the 'feedback_detail' column of 'sessions' in the schema cache" } })
      .mockResolvedValueOnce({ error: null });
    const ok = await pushSessionToCloud('user-1', { ...session, id: 's-3', scoringSessionId: 'exam-x', practiceOnly: false });
    expect(ok).toBe(true);
    const [retry] = upsertMock.mock.calls[1] as [Record<string, unknown>];
    expect(retry).not.toHaveProperty('feedback_detail');
    expect(retry.scoring_session_id).toBe('exam-x');
    expect(retry.practice_only).toBe(false);
  });

  it('resends without it when the size CHECK refuses the blob', async () => {
    upsertMock
      .mockResolvedValueOnce({ error: { message: 'new row for relation "sessions" violates check constraint "sessions_feedback_detail_check"' } })
      .mockResolvedValueOnce({ error: null });
    expect(await pushSessionToCloud('user-1', { ...session, id: 's-4' })).toBe(true);
    expect(upsertMock.mock.calls[1][0]).not.toHaveProperty('feedback_detail');
  });

  it('a row rebuilt from the stored summary (offline queue) never sends feedback_detail', async () => {
    storageSet(STORAGE_KEYS.analytics, {
      sessions: [{ id: 'q-1', date: session.createdAt, mode: 'practice', topicKey: 'free_time', questionText: 'Q', transcript: 'T', wordCount: 3, score: 5, durationSec: 10, feedbackSummary: 'x' }],
      totalWords: 3, streak: { count: 0, lastDate: null }, challengeLog: {},
    });
    storageSet(STORAGE_KEYS.pendingSyncSessionIds, ['q-1']);
    await flushPendingQueue('user-1');
    const [row] = upsertMock.mock.calls[0] as [Record<string, unknown>];
    expect(row.id).toBe('q-1');
    expect(row).not.toHaveProperty('feedback_detail');
  });
});

// @vitest-environment jsdom
//
// learn-marking §7/§8.1 — the ladder reply through the real getAIFeedback →
// normalizeBackendFeedback path, using a recorded gate-run reply (fam_01
// simple answer). Only the scheme is ever sent, never a marking level.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
import fixture from '../../../domain/learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import { getAIFeedback, LADDER_CHECK_GRACE_MS } from '../apiClient';
import { validateBackendFeedback } from '../feedbackSchema';
import { LEARN_MARKING_SCHEME, MARKING_LEVELS, markedScore, resolveMarkedScore } from '../../../domain/learn/marking/markingLevel';
import type { Question } from '../../../types';

const QUESTION = {
  id: 'fam_01',
  text: 'Décris ta famille.',
  topicKey: 'family',
  difficulty: 1,
  modelAnswer: '',
  keyVocab: [],
} as unknown as Question;

const TRANSCRIPT = fixture.request.transcript;

const fetchMock = vi.fn();

function mockBackend(reply: unknown) {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => reply });
  vi.stubGlobal('fetch', fetchMock);
}

function sentBody(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
  return JSON.parse(init.body) as Record<string, unknown>;
}

describe('ladder reply (learn-marking §7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
  });

  it('keeps levelCheck, stamps markingVersion, and leaves scores at Exam standard', async () => {
    mockBackend(fixture.response);
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech', LEARN_MARKING_SCHEME);
    expect(fb.engineMeta?.actualEngine).not.toBe('offline');
    expect(fb.levelCheck?.scheme).toBe('ladder-v1');
    expect(fb.markingVersion).toBe('ladder-v1');
    expect(fb.promptVersion).toBe('learn-prompt-v8');
    expect(fb.scores.overall).toBe(6.8);
    expect(markedScore(fb, 'exam')).toBe(fb.scores.overall);
    expect(MARKING_LEVELS.map((l) => markedScore(fb, l))).toEqual([8.8, 7.1, 6.8, 5.3, 4]);
  });

  it('reads a Design D reply (two backend calls) the same way', async () => {
    mockBackend({
      ...fixture.response,
      promptVersion: 'learn-prompt-v6+ladder-check-v3',
      ladderCheckMeta: { modelUsed: 'groq/openai/gpt-oss-120b', latencyMs: 3100 },
    });
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech', LEARN_MARKING_SCHEME);
    expect(fb.engineMeta?.actualEngine).toBe('groq');
    expect(fb.levelCheck?.scheme).toBe('ladder-v1');
    expect(fb.promptVersion).toBe('learn-prompt-v6+ladder-check-v3');
    expect(MARKING_LEVELS.map((l) => markedScore(fb, l))).toEqual([8.8, 7.1, 6.8, 5.3, 4]);
  });

  it('a failed level checklist still gives graded feedback, with no levelCheck', async () => {
    // Backend Design D: when no provider returns the checklist, the v6 feedback is served without
    // levelCheck and with ladderCheckError (learn-marking §8.3 "Level marking unavailable").
    const { levelCheck: _dropped, ...rest } = fixture.response as Record<string, unknown>;
    void _dropped;
    mockBackend({ ...rest, promptVersion: 'learn-prompt-v6', ladderCheckError: 'groq timeout; gemini quota_exhausted' });
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech', LEARN_MARKING_SCHEME);
    expect(fb.engineMeta?.actualEngine).toBe('groq');
    expect(fb.levelCheck).toBeUndefined();
    expect(fb.scores.overall).toBe(6.8);
    expect(resolveMarkedScore(fb, 'B1')).toMatchObject({ score: 6.8, level: 'exam', levelMarked: false });
  });

  it('gives a ladder request time for the second backend call before giving up on Groq', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockReset();
      fetchMock.mockImplementation((_url: string, init: { signal: AbortSignal }) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => fixture.response }), 40000);
        init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
      }));
      vi.stubGlobal('fetch', fetchMock);
      const pending = getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech', LEARN_MARKING_SCHEME);
      await vi.advanceTimersByTimeAsync(41000);
      const fb = await pending;
      expect(fb.engineMeta?.actualEngine).toBe('groq'); // 15 s Groq budget + LADDER_CHECK_GRACE_MS
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(LADDER_CHECK_GRACE_MS).toBe(60000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends marking: ladder-v1 and nothing that names a level', async () => {
    mockBackend(fixture.response);
    await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech', LEARN_MARKING_SCHEME);
    const body = sentBody();
    expect(body.marking).toBe('ladder-v1');
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/markingLevel|strictness/i);
    expect(body).not.toHaveProperty('level');
  });

  it('other callers send no marking field (they stay on learn-prompt-v6)', async () => {
    mockBackend(fixture.response);
    await getAIFeedback(TRANSCRIPT, QUESTION);
    expect(sentBody()).not.toHaveProperty('marking');
  });

  it('a malformed levelCheck degrades to undefined without failing the reply', () => {
    const broken = { ...fixture.response, levelCheck: { ...fixture.response.levelCheck, subScoresByLevel: { A1: 'x' } } };
    const parsed = validateBackendFeedback(broken, 'test');
    expect(parsed.levelCheck).toBeUndefined();
    expect(parsed.scores).toEqual(fixture.response.scores);
  });

  it('a malformed needs list empties only that level', () => {
    const lc = fixture.response.levelCheck;
    const broken = { ...fixture.response, levelCheck: { ...lc, needsByLevel: { ...lc.needsByLevel, B1: [{ ladder: 'Z' }] } } };
    const parsed = validateBackendFeedback(broken, 'test');
    expect(parsed.levelCheck?.needsByLevel.B1).toEqual([]);
    expect(parsed.levelCheck?.needsByLevel.A1).toHaveLength(1);
  });
});

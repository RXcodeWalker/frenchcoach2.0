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
import { getAIFeedback } from '../apiClient';
import { validateBackendFeedback } from '../feedbackSchema';
import { LEARN_MARKING_SCHEME, MARKING_LEVELS, markedScore } from '../../../domain/learn/marking/markingLevel';
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

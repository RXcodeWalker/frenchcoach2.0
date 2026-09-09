import { describe, it, expect, vi } from 'vitest';

const fromSpy = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: fromSpy })),
}));

import { createSupabaseEnvelopeStore } from '../supabaseEnvelopeStore';
import type { ScoringEnvelope } from '../../../src/domain/igcse/envelope/types';

function buildEnvelope(contentProvenance: ScoringEnvelope['contentProvenance']): ScoringEnvelope {
  return {
    attemptId: 'a1',
    sessionId: 's1',
    scoredAt: '2026-07-10T00:00:00.000Z',
    contentProvenance,
    versions: {
      envelopeSchemaVersion: 'envelope-v0.2',
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
      guardrailsVersion: 'guardrails-v0.1',
      calibrationVersion: 'none',
      gradeBoundarySeries: 'none',
    },
    llm: {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      selfConsistencyRuns: 1,
    },
    stt: {
      model: 'm',
      modelVersion: '1',
      provider: 'p',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'h',
      confidenceSource: 'whisperx-align-score',
      promptBiasedRetries: 0,
      transcribedAt: '2026-07-09T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptConfidence: {
      meanWordConfidence: 0.9,
      lowConfidenceSpanRatio: 0,
      lowConfidenceSpanCount: 0,
      userCorrected: false,
    },
    anchorsUsedByCriterion: { rolePlayTask: [], communication: [], qualityOfLanguage: [] },
    rolePlayTasks: [],
    communication: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' },
      confidence: 'unassessed',
      justification: 'j',
      evidenceSpans: [],
    },
    qualityOfLanguage: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' },
      confidence: 'unassessed',
      justification: 'j',
      evidenceSpans: [],
    },
    total: 16,
    guardrailTriggers: [],
    selfConsistencyOutcomes: { agreement: 'single_run', rerunsRequested: 0 },
    evidenceProfileSnapshot: {
      timeFrameAlignmentByQuestion: [],
      responseCountsByQuestion: [],
      fillerDensityByQuestion: [],
      rolePlayPartsByTask: [],
      topicConversationDurationByConversation: [],
    },
    transcriptSnapshot: {
      contentProvenance,
      rolePlay: [],
      topicConversations: [
        { conversationId: 'topic1', turns: [] },
        { conversationId: 'topic2', turns: [] },
      ],
    },
  };
}

describe('SupabaseEnvelopeStore', () => {
  it('save() throws on confidential-internal before any network call', async () => {
    const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const envelope = buildEnvelope('confidential-internal');

    await expect(store.save(envelope)).rejects.toThrow(/confidential-internal/);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('save() proceeds to the network call for original-practice, writing the real userId and regraded_from: null', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    fromSpy.mockReturnValue({ insert });

    const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const envelope = buildEnvelope('original-practice');

    await store.save(envelope);
    expect(fromSpy).toHaveBeenCalledWith('scoring_envelopes');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', regraded_from: null }));
  });

  it('save() writes regraded_from when the envelope is a regrade', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    fromSpy.mockReturnValue({ insert });

    const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const envelope = { ...buildEnvelope('original-practice'), regradedFrom: 'attempt-0' };

    await store.save(envelope);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ regraded_from: 'attempt-0' }));
  });

  describe('saveOriginal()', () => {
    it('returns the envelope as-is when the insert wins the race', async () => {
      const insert = vi.fn(async () => ({ error: null }));
      fromSpy.mockReturnValue({ insert });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      const envelope = buildEnvelope('original-practice');

      const result = await store.saveOriginal(envelope);
      expect(result).toBe(envelope);
    });

    it('on a 23505 unique violation, loads and returns the winning row instead of throwing', async () => {
      const insert = vi.fn(async () => ({ error: { code: '23505', message: 'duplicate key value' } }));
      const single = vi.fn(async () => ({
        data: { envelope: buildEnvelope('original-practice') },
        error: null,
      }));
      const is = vi.fn(() => ({ single }));
      const eqUser = vi.fn(() => ({ is }));
      const eqSession = vi.fn(() => ({ eq: eqUser }));
      const select = vi.fn(() => ({ eq: eqSession }));
      fromSpy.mockReturnValue({ insert, select });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      const envelope = { ...buildEnvelope('original-practice'), attemptId: 'a2' };

      const result = await store.saveOriginal(envelope);
      expect(result.attemptId).toBe('a1');
      expect(select).toHaveBeenCalledWith('envelope');
      expect(eqSession).toHaveBeenCalledWith('session_id', 's1');
      // A lost idempotency race must never return a foreign envelope — the
      // recovery select is scoped to the authenticated caller (Phase 1.1).
      expect(eqUser).toHaveBeenCalledWith('user_id', 'u1');
      expect(is).toHaveBeenCalledWith('regraded_from', null);
    });

    it('rethrows on a non-conflict error rather than treating it as a race loss', async () => {
      const insert = vi.fn(async () => ({ error: { code: '42501', message: 'permission denied' } }));
      fromSpy.mockReturnValue({ insert });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      const envelope = buildEnvelope('original-practice');

      await expect(store.saveOriginal(envelope)).rejects.toThrow(/permission denied/);
    });
  });

  describe('reads are scoped to the authenticated caller (Phase 1.1 — exam IDOR)', () => {
    it('load() filters user_id, so a foreign attemptId cannot be read', async () => {
      const single = vi.fn(async () => ({ data: null, error: { message: 'no rows' } }));
      const eqUser = vi.fn(() => ({ single }));
      const eqAttempt = vi.fn(() => ({ eq: eqUser }));
      const select = vi.fn(() => ({ eq: eqAttempt }));
      fromSpy.mockReturnValue({ select });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      await expect(store.load('foreign-attempt')).rejects.toThrow();
      expect(eqAttempt).toHaveBeenCalledWith('attempt_id', 'foreign-attempt');
      expect(eqUser).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('list() filters user_id', async () => {
      const eq = vi.fn(async () => ({ data: [], error: null }));
      const select = vi.fn(() => ({ eq }));
      fromSpy.mockReturnValue({ select });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      await store.list();
      expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('listBySession() filters user_id, so a foreign session returns nothing', async () => {
      const eqUser = vi.fn(async () => ({ data: [], error: null }));
      const eqSession = vi.fn(() => ({ eq: eqUser }));
      const select = vi.fn(() => ({ eq: eqSession }));
      fromSpy.mockReturnValue({ select });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      const result = await store.listBySession('someone-elses-session');
      expect(result).toEqual([]);
      expect(eqSession).toHaveBeenCalledWith('session_id', 'someone-elses-session');
      expect(eqUser).toHaveBeenCalledWith('user_id', 'u1');
    });
  });

  describe('listBySession() (C0 skip-and-report)', () => {
    function mockRows(rows: unknown[]): void {
      const eqUser = vi.fn(async () => ({ data: rows.map((envelope) => ({ envelope })), error: null }));
      const eqSession = vi.fn(() => ({ eq: eqUser }));
      const select = vi.fn(() => ({ eq: eqSession }));
      fromSpy.mockReturnValue({ select });
    }

    it('returns the readable envelopes when one row is unreadable, instead of failing wholesale', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        mockRows([
          { ...buildEnvelope('original-practice'), attemptId: 'good-1' },
          {
            ...buildEnvelope('original-practice'),
            attemptId: 'stale-1',
            versions: { ...buildEnvelope('original-practice').versions, envelopeSchemaVersion: 'envelope-v9.9' },
          },
          { ...buildEnvelope('original-practice'), attemptId: 'good-2' },
        ]);

        const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
        const result = await store.listBySession('s1');

        expect(result.map((e) => e.attemptId)).toEqual(['good-1', 'good-2']);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('stale-1'));
      } finally {
        warn.mockRestore();
      }
    });

    it('forward-migrates an older-version row rather than dropping it', async () => {
      const older = buildEnvelope('original-practice');
      mockRows([
        {
          ...older,
          attemptId: 'v01-1',
          versions: { ...older.versions, envelopeSchemaVersion: 'envelope-v0.1' },
        },
      ]);

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      const result = await store.listBySession('s1');

      expect(result).toHaveLength(1);
      expect(result[0].attemptId).toBe('v01-1');
      // The recorded judgement survives the migration untouched.
      expect(result[0].communication.mark).toBe(8);
      expect(result[0].total).toBe(16);
    });
  });
});

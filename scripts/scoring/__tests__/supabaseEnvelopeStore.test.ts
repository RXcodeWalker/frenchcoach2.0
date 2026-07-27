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
      const eq = vi.fn(() => ({ is }));
      const select = vi.fn(() => ({ eq }));
      fromSpy.mockReturnValue({ insert, select });

      const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
      const envelope = { ...buildEnvelope('original-practice'), attemptId: 'a2' };

      const result = await store.saveOriginal(envelope);
      expect(result.attemptId).toBe('a1');
      expect(select).toHaveBeenCalledWith('envelope');
      expect(eq).toHaveBeenCalledWith('session_id', 's1');
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
});

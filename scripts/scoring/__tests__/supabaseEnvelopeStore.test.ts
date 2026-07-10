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
      envelopeSchemaVersion: 'envelope-v0.1',
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
      guardrailsVersion: 'none',
      calibrationVersion: 'none',
      gradeBoundarySeries: 'none',
    },
    llm: {
      model: 'claude-opus-4-8',
      effort: 'high',
      thinking: { type: 'adaptive' },
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
    const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key' });
    const envelope = buildEnvelope('confidential-internal');

    await expect(store.save(envelope)).rejects.toThrow(/confidential-internal/);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('save() proceeds to the network call for original-practice', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    fromSpy.mockReturnValue({ upsert });

    const store = createSupabaseEnvelopeStore({ url: 'https://x.supabase.co', serviceKey: 'key' });
    const envelope = buildEnvelope('original-practice');

    await store.save(envelope);
    expect(fromSpy).toHaveBeenCalledWith('scoring_envelopes');
    expect(upsert).toHaveBeenCalledOnce();
  });
});

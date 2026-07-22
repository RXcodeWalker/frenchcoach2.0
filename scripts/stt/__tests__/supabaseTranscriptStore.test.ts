import { describe, it, expect, vi } from 'vitest';

const fromSpy = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: fromSpy })),
}));

import { createSupabaseTranscriptStore, getLastAttemptAt } from '../supabaseTranscriptStore';
import type { SessionTranscript } from '../../../src/domain/igcse/stt/types';

function buildSession(contentProvenance: SessionTranscript['contentProvenance']): SessionTranscript {
  return {
    schemaVersion: 'session-transcript-v1',
    assemblerVersion: 'stt-assembler-v1',
    sessionId: 's1',
    recordedAt: '2026-05-01T00:00:00.000Z',
    contentProvenance,
    userCorrected: false,
    audio: { sha256: 'x', durationS: 10, sampleRateHz: 16000, channels: 1 },
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
      transcribedAt: '2026-05-01T00:00:00.000Z',
    },
    annotationSource: 'asr-annotation',
    questionSetId: 'qs',
    questionSetHash: 'h',
    matchThreshold: 0.6,
    roleLabelConfidence: 1,
    utterances: [],
    examinerEvents: [],
  };
}

describe('SupabaseTranscriptStore', () => {
  it('save() throws on confidential-internal before any network call', async () => {
    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const session = buildSession('confidential-internal');

    await expect(store.save(session)).rejects.toThrow(/confidential-internal/);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('save() proceeds to the network call for original-practice, writing the real userId', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    fromSpy.mockReturnValue({ upsert });

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const session = buildSession('original-practice');

    await store.save(session);
    expect(fromSpy).toHaveBeenCalledWith('session_transcripts');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1' }));
  });

  it('save() stamps last_attempt_at on every call, not just insert (reliability plan §A)', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    fromSpy.mockReturnValue({ upsert });

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const before = Date.now();
    await store.save(buildSession('original-practice'));
    const after = Date.now();

    const payload = upsert.mock.calls[0][0] as { last_attempt_at: string };
    expect(payload.last_attempt_at).toBeDefined();
    const stamped = new Date(payload.last_attempt_at).getTime();
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(after);
  });
});

describe('getLastAttemptAt', () => {
  it('returns null when no transcript row exists for the sessionId', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    fromSpy.mockReturnValue({ select });

    const result = await getLastAttemptAt({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' }, 'missing');
    expect(result).toBeNull();
  });

  it('returns the parsed timestamp when a row exists', async () => {
    const iso = '2026-07-22T09:00:00.000Z';
    const maybeSingle = vi.fn(async () => ({ data: { last_attempt_at: iso }, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    fromSpy.mockReturnValue({ select });

    const result = await getLastAttemptAt({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' }, 's1');
    expect(result).toEqual(new Date(iso));
  });
});

import { describe, it, expect, vi } from 'vitest';

const fromSpy = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: fromSpy })),
}));

import {
  createSupabaseTranscriptStore,
  getLastAttemptAt,
  TranscriptOwnershipError,
} from '../supabaseTranscriptStore';
import type { SessionTranscript } from '../../../src/domain/igcse/stt/types';

/**
 * save() now does an ownership pre-check —
 * `from('session_transcripts').select('user_id').eq('session_id', …).maybeSingle()`
 * — before the upsert. This helper stubs that pre-check to report the given
 * owner (or no row), and returns the upsert spy for assertions.
 */
function mockSaveChain(existingOwner: string | null) {
  const upsert = vi.fn(async () => ({ error: null }));
  const maybeSingle = vi.fn(async () => ({
    data: existingOwner === null ? null : { user_id: existingOwner },
    error: null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  fromSpy.mockReturnValue({ select, upsert });
  return { upsert, select, eq };
}

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
    const { upsert } = mockSaveChain(null);

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    const session = buildSession('original-practice');

    await store.save(session);
    expect(fromSpy).toHaveBeenCalledWith('session_transcripts');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1' }));
  });

  it('save() upserts when an existing row is owned by the same user', async () => {
    const { upsert } = mockSaveChain('u1');

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    await store.save(buildSession('original-practice'));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1' }));
  });

  it('save() throws TranscriptOwnershipError and does NOT upsert over a row owned by another user (Phase 1.1 — exam IDOR)', async () => {
    const { upsert } = mockSaveChain('someone-else');

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    await expect(store.save(buildSession('original-practice'))).rejects.toBeInstanceOf(TranscriptOwnershipError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('save() stamps last_attempt_at on every call, not just insert (reliability plan §A)', async () => {
    const { upsert } = mockSaveChain(null);

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

  it('load() filters user_id, so a foreign sessionId cannot be read (Phase 1.1)', async () => {
    const single = vi.fn(async () => ({ data: null, error: { message: 'no rows' } }));
    const eqUser = vi.fn(() => ({ single }));
    const eqSession = vi.fn(() => ({ eq: eqUser }));
    const select = vi.fn(() => ({ eq: eqSession }));
    fromSpy.mockReturnValue({ select });

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    await expect(store.load('foreign-session')).rejects.toThrow();
    expect(eqSession).toHaveBeenCalledWith('session_id', 'foreign-session');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('list() filters user_id (Phase 1.1)', async () => {
    const eq = vi.fn(async () => ({ data: [], error: null }));
    const select = vi.fn(() => ({ eq }));
    fromSpy.mockReturnValue({ select });

    const store = createSupabaseTranscriptStore({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' });
    await store.list();
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
  });
});

describe('getLastAttemptAt', () => {
  it('returns null when no transcript row exists for the sessionId', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqSession = vi.fn(() => ({ eq: eqUser }));
    const select = vi.fn(() => ({ eq: eqSession }));
    fromSpy.mockReturnValue({ select });

    const result = await getLastAttemptAt({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' }, 'missing');
    expect(result).toBeNull();
  });

  it('returns the parsed timestamp when a row exists', async () => {
    const iso = '2026-07-22T09:00:00.000Z';
    const maybeSingle = vi.fn(async () => ({ data: { last_attempt_at: iso }, error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqSession = vi.fn(() => ({ eq: eqUser }));
    const select = vi.fn(() => ({ eq: eqSession }));
    fromSpy.mockReturnValue({ select });

    const result = await getLastAttemptAt({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' }, 's1');
    expect(result).toEqual(new Date(iso));
  });

  it('filters by user_id, so a foreign sessionId reads as absent (Phase 1.1)', async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eqUser = vi.fn(() => ({ maybeSingle }));
    const eqSession = vi.fn(() => ({ eq: eqUser }));
    const select = vi.fn(() => ({ eq: eqSession }));
    fromSpy.mockReturnValue({ select });

    await getLastAttemptAt({ url: 'https://x.supabase.co', serviceKey: 'key', userId: 'u1' }, 'foreign-session');
    expect(eqSession).toHaveBeenCalledWith('session_id', 'foreign-session');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'u1');
  });
});

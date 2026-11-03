// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  upserts: [] as Array<{ rows: unknown[]; opts: unknown }>,
  pullError: null as null | { message: string },
}));

vi.mock('../../../lib/supabase', () => {
  const query = {
    select: () => query,
    eq: () => query,
    gte: () => query,
    order: async () => ({ data: state.pullError ? null : state.rows, error: state.pullError }),
    upsert: async (rows: unknown[], opts: unknown) => {
      state.upserts.push({ rows, opts });
      return { error: null };
    },
  };
  return { supabaseConfigured: true, supabase: { from: () => query } };
});

import { pushSpeakingSample, rowToSample, sampleToRow, syncSpeakingLog } from '../speakingLogSync';
import { appendSpeakingSample, getSpeakingLog, type SpeakingSample } from '../../fluency/speakingLog';

const sample = (id: string, at: string): SpeakingSample => ({
  id, at, surface: 'learn', style: 'coach', sessionId: `s-${id}`, topicKey: 'school', questionId: 'sch_1',
  followUp: false, transcriptSource: 'whisper', score: 7, aiFluency: 6, durationSec: 20,
  metricsVersion: 1, recordedS: 20, startDelayS: 1.2, speakingSpanS: 17, voicedS: 13, pauseCount: 3,
  pausesOver1s: 2, pausesOver2s: 1, longestPauseS: 2.4, totalPauseS: 4, wordCount: 30,
  wordsPerMinute: 105.9, articulationWpm: 138.5, wordsPerRun: 7.5,
});

beforeEach(() => {
  localStorage.clear();
  state.rows = [];
  state.upserts = [];
  state.pullError = null;
});

describe('speakingLogSync', () => {
  it('round-trips a sample through a row', () => {
    const s = sample('a', '2026-11-03T10:00:00.000Z');
    const row = sampleToRow('u1', s);
    expect(row.user_id).toBe('u1');
    expect(rowToSample({ ...row, created_at: '2026-11-03T10:00:00+00:00' })).toEqual(s);
  });

  it('pushes with insert-or-ignore on (user_id, id)', async () => {
    await pushSpeakingSample('u1', sample('a', '2026-11-03T10:00:00.000Z'));
    expect(state.upserts[0].opts).toEqual({ onConflict: 'user_id,id', ignoreDuplicates: true });
  });

  it('merges cloud rows into the local log and pushes only what the cloud lacks', async () => {
    appendSpeakingSample(sample('local', '2026-11-02T10:00:00.000Z'));
    appendSpeakingSample(sample('both', '2026-11-01T10:00:00.000Z'));
    state.rows = [
      sampleToRow('u1', sample('cloud', '2026-10-30T10:00:00.000Z')),
      sampleToRow('u1', sample('both', '2026-11-01T10:00:00.000Z')),
    ];
    await syncSpeakingLog('u1');
    expect(getSpeakingLog().map((s) => s.id)).toEqual(['cloud', 'both', 'local']);
    expect(state.upserts).toHaveLength(1);
    expect((state.upserts[0].rows as Array<{ id: string }>).map((r) => r.id)).toEqual(['local']);
  });

  it('does nothing when the pull fails', async () => {
    appendSpeakingSample(sample('local', '2026-11-02T10:00:00.000Z'));
    state.pullError = { message: 'down' };
    await syncSpeakingLog('u1');
    expect(state.upserts).toHaveLength(0);
  });
});

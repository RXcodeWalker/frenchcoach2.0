import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ConductLogEntry } from '../../../../domain/igcse/session/types';

const normalize = vi.fn();
vi.mock('../../../../domain/pronunciation/audioNormalizer', async () => {
  class AudioTooShortError extends Error {}
  class AudioTooLongError extends Error {}
  return { normalizeToWav16kMono: normalize, AudioTooShortError, AudioTooLongError };
});
const track = vi.fn();
vi.mock('../../../telemetry/telemetryService', () => ({ track }));

const { measureExamAudio, readWavPcm16Mono, EXAM_TURN_MAX_SECONDS } = await import('../measureExamAudio');
const { putTurnAudio, getTurnAudio, clearAllExamAudio } = await import('../examAudioStore');
const { AudioTooShortError, AudioTooLongError } = await import('../../../../domain/pronunciation/audioNormalizer');

const SR = 16_000;

/** Canonical 44-byte-header 16-bit mono WAV, like normalizeToWav16kMono writes. */
function wav(samples: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  v.setUint32(24, SR, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.round(samples[i] * 0x7fff), true);
  return new Blob([buf], { type: 'audio/wav' });
}
function tone(seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / SR);
  return out;
}
const silence = (s: number) => new Float32Array(Math.round(s * SR));
const cat = (...p: Float32Array[]) => {
  const out = new Float32Array(p.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of p) { out.set(a, o); o += a.length; }
  return out;
};

const raw = () => new Blob([new Uint8Array(16)], { type: 'audio/webm' });
function candidate(seq: number, part: 'rolePlay' | 'topic1' | 'topic2', extra: object = {}): ConductLogEntry {
  return {
    kind: 'candidate', seq, startS: seq, endS: seq + 1, part, questionId: 'q', transcript: 'Je joue au tennis',
    wordCount: 4, requestedRepeat: false, relevant: true, ...extra,
  } as ConductLogEntry;
}

describe('measureExamAudio', () => {
  beforeEach(() => {
    normalize.mockReset();
    track.mockReset();
    clearAllExamAudio();
  });

  it('reports raw and trimmed seconds per turn, in exam order, one event each', async () => {
    putTurnAudio('s1', 2, raw());
    putTurnAudio('s1', 4, raw());
    normalize
      .mockResolvedValueOnce({ blob: wav(cat(silence(2), tone(1), silence(3))), durationSec: 6, sampleRate: SR })
      .mockResolvedValueOnce({ blob: wav(cat(tone(1), silence(3), tone(1))), durationSec: 5, sampleRate: SR });

    // Entries deliberately out of exam order: topic1 listed before rolePlay.
    const out = await measureExamAudio('s1', [candidate(4, 'topic1'), candidate(2, 'rolePlay')]);

    expect(out.map((m) => [m.part, m.turnKey, m.status])).toEqual([
      ['rolePlay', 2, 'measured'],
      ['topic1', 4, 'measured'],
    ]);
    expect(out[0].rawS).toBe(6);
    expect(out[0].trimmedS).toBeCloseTo(1.3, 1);
    expect(out[1].rawS).toBe(5);
    expect(out[1].trimmedS).toBeCloseTo(2.6, 1);
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenNthCalledWith(1, {
      name: 'exam_pronunciation_audio_measured',
      props: { session_id: 's1', part: 'rolePlay', turn_key: 2, status: 'measured', raw_s: out[0].rawS, trimmed_s: out[0].trimmedS },
    });
  });

  it('asks the normaliser for the exam ceiling, not the Learn default', async () => {
    putTurnAudio('s1', 2, raw());
    normalize.mockResolvedValue({ blob: wav(tone(1)), durationSec: 1, sampleRate: SR });
    await measureExamAudio('s1', [candidate(2, 'topic1')]);
    expect(normalize).toHaveBeenCalledWith(expect.any(Blob), { maxSeconds: EXAM_TURN_MAX_SECONDS });
    expect(EXAM_TURN_MAX_SECONDS).toBeGreaterThan(60);
  });

  it('reports no_audio for a speech turn with no stored recording, without decoding anything', async () => {
    const out = await measureExamAudio('s1', [candidate(2, 'topic1')]);
    expect(out).toEqual([{ sessionId: 's1', part: 'topic1', turnKey: 2, status: 'no_audio', rawS: null, trimmedS: null }]);
    expect(normalize).not.toHaveBeenCalled();
    expect(track.mock.calls[0][0].props).toMatchObject({ status: 'no_audio', raw_s: null, trimmed_s: null });
  });

  it('skips typed, repeat and non-answer turns entirely (no event, no decode)', async () => {
    putTurnAudio('s1', 2, raw());
    const out = await measureExamAudio('s1', [
      candidate(2, 'topic1', { inputMode: 'text' }),
      candidate(4, 'topic1', { requestedRepeat: true }),
      candidate(6, 'topic1', { intent: 'dont_know' }),
    ]);
    expect(out).toEqual([]);
    expect(normalize).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('classifies a recording with no speech in it as no_speech', async () => {
    putTurnAudio('s1', 2, raw());
    normalize.mockResolvedValue({ blob: wav(silence(2)), durationSec: 2, sampleRate: SR });
    const [m] = await measureExamAudio('s1', [candidate(2, 'topic1')]);
    expect(m).toMatchObject({ status: 'no_speech', rawS: 2, trimmedS: 0 });
  });

  it('maps normaliser errors to statuses and keeps going with the next turn', async () => {
    putTurnAudio('s1', 2, raw());
    putTurnAudio('s1', 4, raw());
    putTurnAudio('s1', 6, raw());
    putTurnAudio('s1', 8, raw());
    normalize
      .mockRejectedValueOnce(new AudioTooShortError(0.1))
      .mockRejectedValueOnce(new AudioTooLongError(200))
      .mockRejectedValueOnce(new Error('EncodingError'))
      .mockResolvedValueOnce({ blob: wav(tone(1)), durationSec: 1, sampleRate: SR });
    const out = await measureExamAudio('s1', [
      candidate(2, 'topic1'), candidate(4, 'topic1'), candidate(6, 'topic1'), candidate(8, 'topic1'),
    ]);
    expect(out.map((m) => m.status)).toEqual(['too_short', 'too_long', 'decode_failed', 'measured']);
  });

  it('processes turns strictly one at a time', async () => {
    putTurnAudio('s1', 2, raw());
    putTurnAudio('s1', 4, raw());
    let inFlight = 0;
    let maxInFlight = 0;
    normalize.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return { blob: wav(tone(1)), durationSec: 1, sampleRate: SR };
    });
    await measureExamAudio('s1', [candidate(2, 'topic1'), candidate(4, 'topic1')]);
    expect(maxInFlight).toBe(1);
  });

  it('never rejects, even if telemetry throws', async () => {
    putTurnAudio('s1', 2, raw());
    normalize.mockResolvedValue({ blob: wav(tone(1)), durationSec: 1, sampleRate: SR });
    track.mockImplementation(() => { throw new Error('sentry down'); });
    await expect(measureExamAudio('s1', [candidate(2, 'topic1')])).resolves.toBeInstanceOf(Array);
  });

  it('leaves the stored recording untouched', async () => {
    const original = raw();
    putTurnAudio('s1', 2, original);
    normalize.mockResolvedValue({ blob: wav(tone(1)), durationSec: 1, sampleRate: SR });
    await measureExamAudio('s1', [candidate(2, 'topic1')]);
    expect(getTurnAudio('s1', 2)).toBe(original);
  });
});

describe('readWavPcm16Mono', () => {
  it('round-trips samples and the sample rate', async () => {
    const src = tone(0.1);
    const { samples, sampleRate } = await readWavPcm16Mono(wav(src));
    expect(sampleRate).toBe(SR);
    expect(samples.length).toBe(src.length);
    expect(samples[100]).toBeCloseTo(src[100], 3);
  });
});

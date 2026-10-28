import { beforeEach, describe, expect, it, vi } from 'vitest';

let fail: Error | null = null;
const normalize = vi.fn();
vi.mock('../../../../domain/pronunciation/audioNormalizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../domain/pronunciation/audioNormalizer')>();
  return { ...actual, normalizeToWav16kMono: async (...a: unknown[]) => {
      if (fail) throw fail;
      return normalize(...a);
    } };
});

const { measureAnswerPauses, ANSWER_MAX_SECONDS } = await import('../answerPauses');
const { encodePcm16Wav, AudioTooShortError } = await import('../../../../domain/pronunciation/audioNormalizer');

const RATE = 16000;

/** Tone and silence stretches, in seconds. */
function pcm(parts: Array<['tone' | 'silence', number]>): Float32Array {
  const total = parts.reduce((n, [, s]) => n + Math.round(s * RATE), 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const [kind, s] of parts) {
    const n = Math.round(s * RATE);
    if (kind === 'tone') for (let i = 0; i < n; i++) out[at + i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / RATE);
    at += n;
  }
  return out;
}

const RECORDING = new Blob(['webm'], { type: 'audio/webm' });

beforeEach(() => {
  normalize.mockReset();
  fail = null;
});

describe('measureAnswerPauses (the "Flow" line)', () => {
  it('counts internal pauses over 2 s on the untrimmed recording', async () => {
    const wav = encodePcm16Wav(pcm([['silence', 1], ['tone', 1], ['silence', 2.5], ['tone', 1], ['silence', 0.5], ['tone', 1], ['silence', 3]]), RATE);
    normalize.mockResolvedValue({ blob: wav, durationSec: 10, sampleRate: RATE });
    const pauses = await measureAnswerPauses(RECORDING);
    // Leading and trailing silence is reaching for / releasing the mic, not a pause.
    expect(pauses?.pausesOver2s).toBe(1);
    expect(pauses?.longestPauseS).toBeCloseTo(2.5, 1);
    expect(normalize).toHaveBeenCalledWith(RECORDING, { maxSeconds: ANSWER_MAX_SECONDS });
  });

  it('smooth speech has no long pause', async () => {
    normalize.mockResolvedValue({ blob: encodePcm16Wav(pcm([['tone', 2], ['silence', 0.8], ['tone', 2]]), RATE), durationSec: 4.8, sampleRate: RATE });
    expect((await measureAnswerPauses(RECORDING))?.pausesOver2s).toBe(0);
  });

  it('is null for silence or audio that cannot be decoded — the card then says nothing about flow', async () => {
    normalize.mockResolvedValue({ blob: encodePcm16Wav(pcm([['silence', 3]]), RATE), durationSec: 3, sampleRate: RATE });
    expect(await measureAnswerPauses(RECORDING)).toBeNull();
    fail = new AudioTooShortError(0.2);
    expect(await measureAnswerPauses(RECORDING)).toBeNull();
    fail = new DOMException('decode failed', 'EncodingError');
    expect(await measureAnswerPauses(RECORDING)).toBeNull();
  });
});

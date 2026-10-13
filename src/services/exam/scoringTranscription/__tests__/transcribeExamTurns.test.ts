import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsentRequiredError } from '../../../../lib/consentRequired';
import { AuthRequiredError } from '../../../../lib/authToken';
import { TranscribeHttpError, TranscribeTimeoutError } from '../../../api/apiClient';
import type { TranscribeAudioResult } from '../../../api/apiClient';
import type { RecognitionSegment } from '../../../../domain/igcse/stt/types';
import {
  EXAM_ASR_MAX_ATTEMPTS,
  EXAM_ASR_MAX_RETRY_WAIT_S,
  assessBatchReading,
  classifyTranscribeError,
  createExamTurnTranscriber,
  createExamTurnTranscriberFor,
  isBatchAsrEnabled,
  type ExamTurnJob,
} from '../transcribeExamTurns';

const seg = (over: Partial<RecognitionSegment> = {}): RecognitionSegment => ({
  startS: 0, endS: 2, text: 'Ils ont un chien', avgLogprob: -0.2, noSpeechProb: 0.02, compressionRatio: 1.1, ...over,
});

const ok = (text: string, over: Partial<TranscribeAudioResult> = {}): TranscribeAudioResult => ({
  text, source: 'groq-whisper', model: 'whisper-large-v3', segments: [seg({ text })], ...over,
});

const job = (turnKey: number, over: Partial<ExamTurnJob> = {}): ExamTurnJob => ({
  turnKey,
  blob: new Blob(['x']),
  prompt: 'Tu as des animaux ?',
  liveText: 'Ils sont en chien',
  ...over,
});

const hashPrompt = async (p: string) => `hash(${p})`;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('assessBatchReading', () => {
  it('accepts a normal reading', () => {
    expect(assessBatchReading(ok('Ils ont un chien'), 'Tu as des animaux ?', 'Ils sont en chien')).toBeNull();
  });

  it('rejects an empty reading only when the live captions heard words', () => {
    expect(assessBatchReading({ text: '  ', segments: [] }, 'Q', 'des mots')).toBe('asr-rejected');
    expect(assessBatchReading({ text: '', segments: [] }, 'Q', '')).toBeNull();
  });

  it('rejects when every segment looks like silence, but not when only some do', () => {
    const silent = seg({ noSpeechProb: 0.9, avgLogprob: -1.4 });
    expect(assessBatchReading({ text: 'Merci.', segments: [silent, silent] }, 'Q', 'merci')).toBe('asr-rejected');
    expect(assessBatchReading({ text: 'Merci. Bonjour', segments: [silent, seg()] }, 'Q', 'merci')).toBeNull();
    // High no-speech probability alone, with a confident transcription, is not enough.
    expect(assessBatchReading({ text: 'Oui', segments: [seg({ noSpeechProb: 0.9, avgLogprob: -0.3 })] }, 'Q', 'oui')).toBeNull();
  });

  it('rejects an echoed prompt the live captions do not corroborate', () => {
    const prompt = 'Qu\'est-ce que tu fais le week-end ?';
    expect(assessBatchReading(ok("Qu'est-ce que tu fais le week-end"), prompt, '')).toBe('asr-rejected');
    expect(assessBatchReading(ok("Qu'est-ce que tu fais"), prompt, 'euh')).toBe('asr-rejected');
  });

  it('keeps a student who really repeated the question (the live captions heard it too) and short overlaps', () => {
    const prompt = 'Tu as des animaux ?';
    expect(assessBatchReading(ok('Tu as des animaux'), prompt, 'tu as des animaux')).toBeNull();
    expect(assessBatchReading(ok('Des animaux'), prompt, '')).toBeNull(); // 2 words: below ASR_ECHO_MIN_WORDS
    expect(assessBatchReading(ok("J'ai des animaux à la maison"), prompt, '')).toBeNull();
  });
});

describe('classifyTranscribeError', () => {
  it('maps each failure to its recorded reason', () => {
    expect(classifyTranscribeError(new ConsentRequiredError())).toBe('consent');
    expect(classifyTranscribeError(new TranscribeTimeoutError())).toBe('asr-timeout');
    expect(classifyTranscribeError(new TranscribeHttpError(429, null))).toBe('quota');
    expect(classifyTranscribeError(new TranscribeHttpError(503, null))).toBe('asr-failed');
    expect(classifyTranscribeError(new AuthRequiredError('sign in'))).toBe('asr-failed');
    expect(classifyTranscribeError(new TypeError('Failed to fetch'))).toBe('asr-failed');
  });
});

describe('isBatchAsrEnabled (kill switch)', () => {
  it('is on by default and off for 0 / false / off', () => {
    expect(isBatchAsrEnabled()).toBe(true);
    for (const v of ['0', 'false', 'OFF', ' 0 ']) {
      vi.stubEnv('VITE_EXAM_BATCH_ASR', v);
      expect(isBatchAsrEnabled()).toBe(false);
    }
    vi.stubEnv('VITE_EXAM_BATCH_ASR', '1');
    expect(isBatchAsrEnabled()).toBe(true);
  });
});

describe('createExamTurnTranscriberFor', () => {
  it('exists only when batch ASR is on and the browser has Web Speech', () => {
    expect(createExamTurnTranscriberFor({ webSpeechAvailable: true })).not.toBeNull();
    // Firefox: the answer text is already Whisper's; a job-less transcriber would mislabel it 'no-audio'.
    expect(createExamTurnTranscriberFor({ webSpeechAvailable: false })).toBeNull();
    vi.stubEnv('VITE_EXAM_BATCH_ASR', '0');
    expect(createExamTurnTranscriberFor({ webSpeechAvailable: true })).toBeNull();
  });
});

describe('createExamTurnTranscriber', () => {
  it('records Whisper as primary with the live captions as the second opinion', async () => {
    const transcribe = vi.fn().mockResolvedValue(ok('  Ils ont\n un chien '));
    const t = createExamTurnTranscriber({ transcribe, hashPrompt });
    t.enqueue(job(4));
    const map = await t.settle();

    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(transcribe.mock.calls[0][1]).toBe('fr');
    expect(transcribe.mock.calls[0][2]).toMatchObject({ prompt: 'Tu as des animaux ?', purpose: 'exam_turn' });
    expect(map.get(4)).toEqual({
      primary: {
        text: 'Ils ont un chien',
        model: 'whisper-large-v3',
        promptHash: 'hash(Tu as des animaux ?)',
        segments: [seg({ text: '  Ils ont\n un chien ' })], // provider segments are kept as returned
      },
      secondary: { source: 'web-speech-live', text: 'Ils sont en chien' },
      selected: 'primary',
      fallbackReason: null,
    });
  });

  it('never has more than two requests in flight', async () => {
    let active = 0;
    let peak = 0;
    const release: Array<() => void> = [];
    const transcribe = vi.fn(
      () =>
        new Promise<TranscribeAudioResult>((resolve) => {
          active += 1;
          peak = Math.max(peak, active);
          release.push(() => {
            active -= 1;
            resolve(ok('Bonjour tout le monde'));
          });
        }),
    );
    const t = createExamTurnTranscriber({ transcribe, hashPrompt });
    for (const k of [1, 2, 3, 4, 5]) t.enqueue(job(k, { liveText: 'bonjour tout le monde' }));
    const settled = t.settle();

    await vi.waitFor(() => expect(release.length).toBe(2));
    expect(transcribe).toHaveBeenCalledTimes(2);
    while (release.length > 0) {
      release.shift()?.();
      await new Promise((r) => setTimeout(r, 0));
    }
    const map = await settled;
    expect(peak).toBe(2);
    expect([...map.keys()].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([...map.values()].every((r) => r.selected === 'primary')).toBe(true);
  });

  it('honours a 429 Retry-After for the whole queue, then retries and succeeds', async () => {
    const waits: number[] = [];
    let clock = 1_000_000;
    const calls: number[] = [];
    const transcribe = vi.fn(async () => {
      calls.push(clock);
      if (calls.length === 1) throw new TranscribeHttpError(429, 7);
      return ok('Bonjour tout le monde');
    });
    const t = createExamTurnTranscriber({
      transcribe,
      hashPrompt,
      maxInFlight: 1,
      now: () => clock,
      sleep: async (ms) => { waits.push(ms); clock += ms; },
    });
    t.enqueue(job(1, { liveText: 'bonjour' }));
    t.enqueue(job(2, { liveText: 'bonjour' }));
    const map = await t.settle();

    expect(waits).toEqual([7000]); // job 2 starts after the pause has elapsed: no extra wait
    expect(transcribe).toHaveBeenCalledTimes(3);
    expect(map.get(1)?.selected).toBe('primary');
    expect(map.get(2)?.selected).toBe('primary');
  });

  it('caps a very long Retry-After, and gives up with "quota" after the attempt budget', async () => {
    const waits: number[] = [];
    let clock = 0;
    const transcribe = vi.fn().mockRejectedValue(new TranscribeHttpError(429, 600));
    const t = createExamTurnTranscriber({
      transcribe, hashPrompt, now: () => clock, sleep: async (ms) => { waits.push(ms); clock += ms; },
    });
    t.enqueue(job(1));
    const map = await t.settle();
    expect(transcribe).toHaveBeenCalledTimes(EXAM_ASR_MAX_ATTEMPTS);
    expect(waits.every((w) => w <= EXAM_ASR_MAX_RETRY_WAIT_S * 1000)).toBe(true);
    expect(map.get(1)).toMatchObject({ selected: 'secondary', fallbackReason: 'quota' });
  });

  it('a 429 without Retry-After (the daily cap) falls back to "quota" immediately, no retry', async () => {
    const transcribe = vi.fn().mockRejectedValue(new TranscribeHttpError(429, null));
    const t = createExamTurnTranscriber({ transcribe, hashPrompt });
    t.enqueue(job(1));
    const map = await t.settle();
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(map.get(1)).toMatchObject({ fallbackReason: 'quota', selected: 'secondary' });
    expect(map.get(1)?.primary).toBeUndefined();
  });

  it.each([
    ['consent', new ConsentRequiredError(), 'consent'],
    ['timeout', new TranscribeTimeoutError(), 'asr-timeout'],
    ['server error', new TranscribeHttpError(503, null), 'asr-failed'],
    ['network error', new TypeError('Failed to fetch'), 'asr-failed'],
  ])('falls back to the live captions on %s', async (_label, error, reason) => {
    const t = createExamTurnTranscriber({ transcribe: vi.fn().mockRejectedValue(error), hashPrompt });
    t.enqueue(job(1));
    const map = await t.settle();
    expect(map.get(1)).toEqual({
      secondary: { source: 'web-speech-live', text: 'Ils sont en chien' },
      selected: 'secondary',
      fallbackReason: reason,
    });
  });

  it('"transcription-unavailable" and rejected readings fall back with the right reason', async () => {
    const transcribe = vi
      .fn()
      .mockResolvedValueOnce({ text: '', source: 'transcription-unavailable', segments: [] })
      .mockResolvedValueOnce({ text: '', source: 'groq-whisper', model: 'm', segments: [] });
    const t = createExamTurnTranscriber({ transcribe, hashPrompt, maxInFlight: 1 });
    t.enqueue(job(1));
    t.enqueue(job(2));
    const map = await t.settle();
    expect(map.get(1)?.fallbackReason).toBe('asr-failed');
    expect(map.get(2)?.fallbackReason).toBe('asr-rejected');
  });

  it('at the deadline, unfinished work becomes "asr-timeout" and is aborted; late results are ignored', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    let finishLate: (() => void) | undefined;
    const transcribe = vi.fn(
      (_blob: Blob, _lang?: string, opts?: { signal?: AbortSignal }) =>
        new Promise<TranscribeAudioResult>((resolve) => {
          signal = opts?.signal;
          finishLate = () => resolve(ok('Trop tard pour être noté'));
        }),
    );
    const t = createExamTurnTranscriber({ transcribe, hashPrompt, maxInFlight: 1 });
    t.enqueue(job(1));
    t.enqueue(job(2)); // never starts: the first holds the only slot
    const settled = t.settle({ timeoutMs: 45_000 });
    await vi.advanceTimersByTimeAsync(44_999);
    let done = false;
    void settled.then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    const map = await settled;

    expect(map.get(1)).toMatchObject({ selected: 'secondary', fallbackReason: 'asr-timeout' });
    expect(map.get(2)).toMatchObject({ selected: 'secondary', fallbackReason: 'asr-timeout' });
    expect(signal?.aborted).toBe(true);
    finishLate?.();
    await vi.advanceTimersByTimeAsync(10);
    expect(map.get(1)?.fallbackReason).toBe('asr-timeout');
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it('settle waits for a pending capture that enqueues the last answer', async () => {
    const transcribe = vi.fn().mockResolvedValue(ok('Bonjour tout le monde'));
    const t = createExamTurnTranscriber({ transcribe, hashPrompt });
    const capture = new Promise<void>((resolve) => setTimeout(() => { t.enqueue(job(9, { liveText: 'bonjour' })); resolve(); }, 5));
    const map = await t.settle({ alsoWait: capture });
    expect(map.get(9)?.selected).toBe('primary');
  });

  it('settle with nothing enqueued resolves empty, is idempotent, and ignores jobs added afterwards', async () => {
    const transcribe = vi.fn();
    const t = createExamTurnTranscriber({ transcribe, hashPrompt });
    const first = await t.settle();
    expect(first.size).toBe(0);
    t.enqueue(job(1));
    expect(await t.settle()).toBe(first);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('cancel stops queued work and aborts in-flight requests', async () => {
    let signal: AbortSignal | undefined;
    const transcribe = vi.fn((_b: Blob, _l?: string, opts?: { signal?: AbortSignal }) => {
      signal = opts?.signal;
      return new Promise<TranscribeAudioResult>(() => undefined);
    });
    const t = createExamTurnTranscriber({ transcribe, hashPrompt, maxInFlight: 1 });
    t.enqueue(job(1));
    t.enqueue(job(2));
    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledTimes(1));
    t.cancel();
    expect(signal?.aborted).toBe(true);
    t.enqueue(job(3));
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it('a duplicate turn key is ignored (first enqueue wins)', async () => {
    const transcribe = vi.fn().mockResolvedValue(ok('Bonjour tout le monde'));
    const t = createExamTurnTranscriber({ transcribe, hashPrompt });
    t.enqueue(job(1, { liveText: 'bonjour' }));
    t.enqueue(job(1, { liveText: 'autre' }));
    const map = await t.settle();
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(map.get(1)?.secondary.text).toBe('bonjour');
  });
});

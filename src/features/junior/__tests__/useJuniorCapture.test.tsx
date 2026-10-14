// @vitest-environment jsdom
// Junior capture (junior-track §4): tap once to start, second tap or silence stops, and rapid taps
// leave exactly one live capture.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { END_SILENCE_MS, HARD_LIMIT_MS } from '../../../domain/junior/capture';
import { MIC_SOUND_LEVEL } from '../../../domain/junior/warmup';

const rec = {
  live: 0,
  maxLive: 0,
  starts: 0,
  stops: 0,
  level: { current: 0 },
  transcript: 'bonjour',
  stopDelay: 0,
  sttSupported: true,
};

vi.mock('../../recording/useRecording', () => ({
  useRecording: (blocked: boolean) => ({
    micLevel: { levelRef: rec.level },
    start: () => {
      if (blocked) return;
      rec.starts += 1;
      rec.live += 1;
      rec.maxLive = Math.max(rec.maxLive, rec.live);
    },
    stop: async () => {
      if (rec.stopDelay) await new Promise((r) => setTimeout(r, rec.stopDelay));
      rec.stops += 1;
      rec.live -= 1;
      return rec.transcript;
    },
    audioBlobPromise: async () => null,
    get sttSupported() { return rec.sttSupported; },
  }),
}));

import { useJuniorCapture, type CaptureResult, type ReadTranscript } from '../useJuniorCapture';

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(rec, { live: 0, maxLive: 0, starts: 0, stops: 0, transcript: 'bonjour', stopDelay: 0, sttSupported: true });
  rec.level.current = 0;
});
afterEach(() => vi.useRealTimers());

function setup(blocked = false, read?: ReadTranscript) {
  const results: CaptureResult[] = [];
  const hook = renderHook(() => useJuniorCapture(blocked, (r) => results.push(r), read));
  return { hook, results };
}

describe('useJuniorCapture', () => {
  it('starts on one tap and stops on a second tap, delivering transcript and peak level', async () => {
    const { hook, results } = setup();
    act(() => hook.result.current.toggle());
    expect(hook.result.current.listening).toBe(true);
    expect(rec.starts).toBe(1);
    rec.level.current = 0.6;
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    await act(async () => { hook.result.current.toggle(); await vi.advanceTimersByTimeAsync(0); });
    expect(hook.result.current.listening).toBe(false);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ transcript: 'bonjour', endedBy: 'tap' });
    expect(results[0].peak).toBeGreaterThanOrEqual(0.6);
  });

  it('rapid taps never overlap recordings: at most one live capture, ever', async () => {
    rec.stopDelay = 50;
    const { hook } = setup();
    await act(async () => {
      for (let i = 0; i < 8; i++) hook.result.current.toggle();
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(rec.maxLive).toBe(1);
    // Start, stop, then every further tap while the stop was still reading was ignored.
    expect(rec.starts).toBe(1);
    expect(rec.stops).toBe(1);
    // Once it has settled, a fresh tap starts one new capture.
    await act(async () => { hook.result.current.toggle(); await vi.advanceTimersByTimeAsync(0); });
    expect(rec.starts).toBe(2);
    expect(rec.maxLive).toBe(1);
  });

  it('stops by itself after the end-of-speech silence once the kid has spoken', async () => {
    const { hook, results } = setup();
    act(() => hook.result.current.toggle());
    rec.level.current = MIC_SOUND_LEVEL + 0.3;
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    rec.level.current = 0;
    await act(async () => { await vi.advanceTimersByTimeAsync(END_SILENCE_MS - 600); });
    expect(results).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(results).toHaveLength(1);
    expect(results[0].endedBy).toBe('silence');
  });

  it('never stops on silence before the kid has said anything, but the hard limit ends it', async () => {
    const { hook, results } = setup();
    act(() => hook.result.current.toggle());
    await act(async () => { await vi.advanceTimersByTimeAsync(HARD_LIMIT_MS - 200); });
    expect(results).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(results).toHaveLength(1);
    expect(results[0].endedBy).toBe('limit');
  });

  it('a blocked (consent pending) capture never starts', () => {
    const { hook } = setup(true);
    act(() => hook.result.current.toggle());
    expect(hook.result.current.listening).toBe(false);
    expect(rec.starts).toBe(0);
  });

  it('cancel ends a live capture without delivering a result', async () => {
    const { hook, results } = setup();
    act(() => hook.result.current.toggle());
    await act(async () => { hook.result.current.cancel(); await vi.advanceTimersByTimeAsync(0); });
    expect(rec.live).toBe(0);
    expect(results).toHaveLength(0);
  });

  describe('the Whisper read (junior-track §2, Batch 4)', () => {
    it('hands the read step the capture and delivers its transcript, with Web Speech support reported', async () => {
      rec.sttSupported = false;
      rec.transcript = '';
      const read = vi.fn<ReadTranscript>(async () => "j'aime le bleu");
      const { hook, results } = setup(false, read);
      act(() => hook.result.current.toggle());
      await act(async () => { hook.result.current.toggle(); await vi.advanceTimersByTimeAsync(0); });
      expect(read).toHaveBeenCalledTimes(1);
      expect(read.mock.calls[0][0]).toMatchObject({ transcript: '', webSpeechSupported: false });
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ transcript: "j'aime le bleu", webSpeechSupported: false });
    });

    it('stays busy while the read is in flight: taps are ignored, so there is still one live capture', async () => {
      let release!: (t: string) => void;
      const read = vi.fn<ReadTranscript>(() => new Promise<string>((r) => { release = r; }));
      const { hook, results } = setup(false, read);
      act(() => hook.result.current.toggle());
      await act(async () => { hook.result.current.toggle(); await vi.advanceTimersByTimeAsync(0); });
      expect(hook.result.current.busy).toBe(true);
      await act(async () => {
        for (let i = 0; i < 5; i++) hook.result.current.toggle();
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(rec.starts).toBe(1);
      expect(rec.maxLive).toBe(1);
      await act(async () => { release('bonjour'); await vi.advanceTimersByTimeAsync(0); });
      expect(hook.result.current.busy).toBe(false);
      expect(results).toHaveLength(1);
    });

    it('a failing read keeps the live transcript', async () => {
      const { hook, results } = setup(false, async () => { throw new Error('boom'); });
      act(() => hook.result.current.toggle());
      await act(async () => { hook.result.current.toggle(); await vi.advanceTimersByTimeAsync(0); });
      expect(results[0].transcript).toBe('bonjour');
    });

    it('cancel while the read is in flight drops the result (its turn is gone)', async () => {
      let release!: (t: string) => void;
      const { hook, results } = setup(false, () => new Promise<string>((r) => { release = r; }));
      act(() => hook.result.current.toggle());
      await act(async () => { hook.result.current.toggle(); await vi.advanceTimersByTimeAsync(0); });
      await act(async () => { hook.result.current.cancel(); release('bonjour'); await vi.advanceTimersByTimeAsync(0); });
      expect(results).toHaveLength(0);
      expect(hook.result.current.busy).toBe(false);
    });
  });
});

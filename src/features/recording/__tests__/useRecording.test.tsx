// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecording } from '../useRecording';

// Minimal fake MediaRecorder — real construction/track handling is out of
// scope here; only the onstop-timing contract that audioBlobPromise() relies
// on is under test.
class FakeMediaRecorder {
  state: 'inactive' | 'recording' = 'recording';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {}
  stop() {
    this.state = 'inactive';
    // Simulate the real, asynchronous onstop callback.
    queueMicrotask(() => this.onstop?.());
  }
}

describe('useRecording — audioBlobPromise', () => {
  beforeEach(() => {
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = Object.assign(
      FakeMediaRecorder,
      { isTypeSupported: () => true },
    );
    // useRecording's start() calls micLevel.attach(stream) before constructing
    // the MediaRecorder; jsdom has no AudioContext, so without a fake here that
    // call throws and the (swallowed) rejection means MediaRecorder never gets
    // constructed at all.
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = class {
      createMediaStreamSource() { return { connect: () => {}, disconnect: () => {} }; }
      createAnalyser() {
        return {
          fftSize: 0,
          smoothingTimeConstant: 0,
          frequencyBinCount: 512,
          getFloatTimeDomainData: () => {},
          getByteFrequencyData: () => {},
          disconnect: () => {},
        };
      }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    };
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the blob when audioBlobPromise() is called after onstop has already fired', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      result.current.start();
    });
    // Flush the getUserMedia().then(...) microtask that attaches the MediaRecorder.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.stop();
    });
    // Flush the MediaRecorder's queued onstop callback.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const blob = await result.current.audioBlobPromise();
    expect(blob).toBeInstanceOf(Blob);
  });

  it('resolves the blob when audioBlobPromise() is called immediately after stop(), before onstop has fired', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // stop() constructs blobPromiseRef synchronously (before MediaRecorder's
    // onstop has had a chance to run), so a caller registered immediately
    // after stop() returns — win or lose the race against onstop — always
    // gets the same promise. This is the ordering Slice 0 fixes.
    let blobPromise!: Promise<Blob | null>;
    await act(async () => {
      const stopPromise = result.current.stop();
      blobPromise = result.current.audioBlobPromise();
      await stopPromise;
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const blob = await blobPromise;
    expect(blob).toBeInstanceOf(Blob);
  });

  it('resolves null when no recorder was active (e.g. permission denied)', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('permission denied')),
      },
    });

    const { result } = renderHook(() => useRecording());

    await act(async () => {
      result.current.start();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.stop();
    });

    const blob = await result.current.audioBlobPromise();
    expect(blob).toBeNull();
  });
});

describe('useRecording — sttSupported / sttError', () => {
  const originalSpeechRecognition = (globalThis as Record<string, unknown>).SpeechRecognition;
  const originalWebkitSpeechRecognition = (globalThis as Record<string, unknown>).webkitSpeechRecognition;

  afterEach(() => {
    (globalThis as Record<string, unknown>).SpeechRecognition = originalSpeechRecognition;
    (globalThis as Record<string, unknown>).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('is false when neither SpeechRecognition nor webkitSpeechRecognition exists', () => {
    delete (globalThis as Record<string, unknown>).SpeechRecognition;
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;

    const { result } = renderHook(() => useRecording());
    expect(result.current.sttSupported).toBe(false);
    expect(result.current.sttError).toBeNull();
  });

  it('is true when SpeechRecognition exists', () => {
    (globalThis as Record<string, unknown>).SpeechRecognition = class {};
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;

    const { result } = renderHook(() => useRecording());
    expect(result.current.sttSupported).toBe(true);
  });

  it('sets sttError from onerror and clears it on the next start()', async () => {
    const instances: FakeSpeechRecognition[] = [];

    class FakeSpeechRecognition {
      lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
      onresult: unknown = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() { instances.push(this); }
      start() {}
      stop() { this.onend?.(); }
      abort() {}
    }
    (globalThis as Record<string, unknown>).SpeechRecognition = FakeSpeechRecognition;
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
    // No MediaRecorder/getUserMedia needed for this test — sttError is independent of the audio path.
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('no mic in this test')) },
    });

    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.start();
    });
    expect(instances.length).toBe(1);

    act(() => {
      instances[0].onerror?.({ error: 'network' });
    });
    expect(result.current.sttError).toBe('network');

    act(() => {
      result.current.start();
    });
    expect(result.current.sttError).toBeNull();
  });
});

describe('useRecording — stop() timeout fallback and generation guard (reliability plan §2.3)', () => {
  class HangingSpeechRecognition {
    lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
    onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start() {}
    stop() { /* never calls onend — simulates a hung recognizer */ }
    abort() {}
  }

  const originalSpeechRecognition = (globalThis as Record<string, unknown>).SpeechRecognition;
  const originalWebkitSpeechRecognition = (globalThis as Record<string, unknown>).webkitSpeechRecognition;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('no mic in this test')) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as Record<string, unknown>).SpeechRecognition = originalSpeechRecognition;
    (globalThis as Record<string, unknown>).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('stop() still resolves via the timeout fallback when the recognizer never fires onend', async () => {
    (globalThis as Record<string, unknown>).SpeechRecognition = HangingSpeechRecognition;
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;

    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.start();
    });

    let transcript = '';
    await act(async () => {
      const stopPromise = result.current.stop().then((t) => { transcript = t; });
      await vi.advanceTimersByTimeAsync(3_000);
      await stopPromise;
    });

    expect(transcript).toBe('');
  });

  it('a stale onend from a superseded generation does not clobber the next recording', async () => {
    const instances: HangingSpeechRecognition[] = [];
    class TrackedFakeSpeechRecognition extends HangingSpeechRecognition {
      constructor() {
        super();
        instances.push(this);
      }
    }
    (globalThis as Record<string, unknown>).SpeechRecognition = TrackedFakeSpeechRecognition;
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;

    const { result } = renderHook(() => useRecording());

    // First recording: start, then stop without awaiting (mirrors
    // SpeedSpeaking.tsx/SpeakingArena.tsx's un-awaited stop() call sites).
    act(() => {
      result.current.start();
    });
    const firstRecognizer = instances[0];
    act(() => {
      result.current.stop();
    });

    // Second recording starts immediately, before the first recognizer's
    // onend has fired.
    act(() => {
      result.current.start();
    });
    expect(instances.length).toBe(2);

    // Simulate the first (superseded) recognizer's onresult/onend firing late.
    act(() => {
      firstRecognizer.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'stale transcript' } }] as unknown as ArrayLike<{ isFinal: boolean; [i: number]: { transcript: string } }>,
      });
      firstRecognizer.onend?.();
    });

    expect(result.current.transcript).not.toContain('stale transcript');
  });
});

describe('useRecording — blocked (Phase 1.6 Part C consent gate)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
    });
    delete (globalThis as Record<string, unknown>).SpeechRecognition;
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('start() is a no-op when blocked=true — never arms isRecording or getUserMedia', async () => {
    const getUserMediaSpy = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMediaSpy },
    });

    const { result } = renderHook(() => useRecording(true));

    act(() => {
      result.current.start();
    });

    expect(result.current.isRecording).toBe(false);
    expect(getUserMediaSpy).not.toHaveBeenCalled();
  });

  it('start() works normally when blocked=false (default)', () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.start();
    });

    expect(result.current.isRecording).toBe(true);
  });
});

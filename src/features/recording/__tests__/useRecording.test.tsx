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

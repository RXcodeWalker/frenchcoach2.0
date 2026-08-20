// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeToWav16kMono,
  AudioTooShortError,
  AudioTooLongError,
} from '../audioNormalizer';

// jsdom has no real Web Audio implementation — fake the two contexts and the
// decoded AudioBuffer, following the same hand-built-fake pattern already
// used for AudioContext in useRecording.test.tsx.
function makeFakeAudioBuffer(durationSec: number, sampleRate = 48_000): AudioBuffer {
  const length = Math.round(durationSec * sampleRate);
  const data = new Float32Array(length);
  // A simple non-zero waveform so the WAV data section isn't all-zero.
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(i * 0.01) * 0.5;
  }
  return {
    duration: durationSec,
    sampleRate,
    numberOfChannels: 1,
    length,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

let closeCallCount = 0;
let lastDecodedBuffer: AudioBuffer | null = null;

function installFakeWebAudio(sourceDurationSec: number) {
  closeCallCount = 0;
  lastDecodedBuffer = makeFakeAudioBuffer(sourceDurationSec);

  class FakeAudioContext {
    async decodeAudioData(): Promise<AudioBuffer> {
      return lastDecodedBuffer!;
    }
    async close(): Promise<void> {
      closeCallCount += 1;
    }
  }

  class FakeOfflineAudioContext {
    destination = {};
    numberOfChannels: number;
    length: number;
    sampleRate: number;

    constructor(numberOfChannels: number, length: number, sampleRate: number) {
      this.numberOfChannels = numberOfChannels;
      this.length = length;
      this.sampleRate = sampleRate;
    }

    createBufferSource() {
      return {
        buffer: null as AudioBuffer | null,
        connect() {},
        start() {},
      };
    }

    async startRendering(): Promise<AudioBuffer> {
      // Simulate resampling: produce a buffer at the target rate/length,
      // downsampling the fake source data by nearest-neighbour (test-only —
      // real resampling is OfflineAudioContext's job in production).
      const targetData = new Float32Array(this.length);
      const source = lastDecodedBuffer!.getChannelData(0);
      const ratio = source.length / this.length;
      for (let i = 0; i < this.length; i++) {
        targetData[i] = source[Math.min(Math.floor(i * ratio), source.length - 1)];
      }
      return {
        duration: this.length / this.sampleRate,
        sampleRate: this.sampleRate,
        numberOfChannels: this.numberOfChannels,
        length: this.length,
        getChannelData: () => targetData,
      } as unknown as AudioBuffer;
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
}

describe('normalizeToWav16kMono', () => {
  beforeEach(() => {
    installFakeWebAudio(2.0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('produces a Blob with a valid RIFF/WAVE header', async () => {
    const input = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    const result = await normalizeToWav16kMono(input);

    expect(result.blob.type).toBe('audio/wav');
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const header = new TextDecoder('ascii').decode(bytes.slice(0, 4));
    const wave = new TextDecoder('ascii').decode(bytes.slice(8, 12));
    expect(header).toBe('RIFF');
    expect(wave).toBe('WAVE');
  });

  it('resamples to 16kHz mono regardless of source rate', async () => {
    const input = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    const result = await normalizeToWav16kMono(input);

    expect(result.sampleRate).toBe(16_000);

    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    const numChannels = view.getUint16(22, true);
    const sampleRateInHeader = view.getUint32(24, true);
    expect(numChannels).toBe(1);
    expect(sampleRateInHeader).toBe(16_000);
  });

  it('reports the correct duration', async () => {
    const input = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    const result = await normalizeToWav16kMono(input);
    expect(result.durationSec).toBeCloseTo(2.0, 1);
  });

  it('throws AudioTooShortError for clips under the minimum duration', async () => {
    installFakeWebAudio(0.1);
    const input = new Blob([new Uint8Array(10)], { type: 'audio/webm' });
    await expect(normalizeToWav16kMono(input)).rejects.toThrow(AudioTooShortError);
  });

  it('throws AudioTooLongError for clips over the decode cap', async () => {
    installFakeWebAudio(70);
    const input = new Blob([new Uint8Array(10)], { type: 'audio/webm' });
    await expect(normalizeToWav16kMono(input)).rejects.toThrow(AudioTooLongError);
  });

  it('closes the decode AudioContext after use (does not leak a live context)', async () => {
    const input = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    await normalizeToWav16kMono(input);
    expect(closeCallCount).toBe(1);
  });

  it('closes the decode AudioContext even when decodeAudioData throws', async () => {
    class ThrowingAudioContext {
      async decodeAudioData(): Promise<AudioBuffer> {
        throw new Error('corrupt audio');
      }
      async close(): Promise<void> {
        closeCallCount += 1;
      }
    }
    vi.stubGlobal('AudioContext', ThrowingAudioContext);

    const input = new Blob([new Uint8Array(10)], { type: 'audio/webm' });
    await expect(normalizeToWav16kMono(input)).rejects.toThrow('corrupt audio');
    expect(closeCallCount).toBe(1);
  });

  it('produces WAV data bytes proportional to the resampled (not source) length', async () => {
    const input = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    const result = await normalizeToWav16kMono(input);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    const dataSize = view.getUint32(40, true);
    // 2 seconds @ 16kHz, 16-bit mono = 2 * 16000 * 2 bytes.
    expect(dataSize).toBe(2 * 16_000 * 2);
    expect(bytes.length).toBe(44 + dataSize);
  });
});

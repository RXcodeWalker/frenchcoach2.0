/**
 * Transient client-side audio normalization for pronunciation assessment
 * uploads: decode -> resample to 16kHz mono -> encode as WAV. Fixes defect
 * #1 (Azure REST short-audio only accepts audio/wav;codecs=audio/pcm or
 * audio/ogg;codecs=opus — never the webm/opus Chrome or mp4/aac Safari
 * actually record) at the source, rather than relying on the backend to
 * guess a Content-Type from a file extension.
 *
 * Called ONLY from httpProvider.ts, at upload time. Never wired into the
 * recording hooks (useRecording.ts / useAudioBlobRecorder.ts) — per the
 * accent-analyzer plan (R3), those keep returning the original compressed
 * blob unchanged, since PronunciationLab/AccentAnalyzer use it for
 * *playback* via an object URL. Persisting or returning the WAV anywhere
 * else would multiply memory for no benefit (WAV is ~10x the compressed
 * size).
 *
 * Uses a short-lived OfflineAudioContext, never the live AudioContext
 * useMicLevel.ts owns — that one is created/closed per-recording and
 * Safari caps concurrent AudioContexts, so normalization must not compete
 * with it. Callers should invoke this after the recording's live
 * AudioContext has been detached (i.e. after stop() resolves).
 */

const TARGET_SAMPLE_RATE = 16_000;

// Hard cap on decoded audio length. Beyond this, the caller (Learn's
// freeform answers) must chunk before normalizing — decoding is the memory
// peak, not the WAV: a 3-minute clip at 48kHz stereo decodes to ~70MB
// transient Float32. This cap keeps a single normalize() call bounded;
// chunking-before-decode for answers longer than this is out of scope here
// (accent-analyzer plan Phase 1, aggregation).
const MAX_DECODE_DURATION_SEC = 35;

const MIN_CLIP_DURATION_SEC = 0.4;

export class AudioTooShortError extends Error {
  constructor(durationSec: number) {
    super(`Recording too short to assess (${durationSec.toFixed(2)}s < ${MIN_CLIP_DURATION_SEC}s)`);
    this.name = 'AudioTooShortError';
  }
}

export class AudioTooLongError extends Error {
  constructor(durationSec: number) {
    super(`Recording too long to normalize in one pass (${durationSec.toFixed(1)}s > ${MAX_DECODE_DURATION_SEC}s)`);
    this.name = 'AudioTooLongError';
  }
}

export interface NormalizedAudio {
  blob: Blob;
  durationSec: number;
  sampleRate: number;
}

/**
 * Decodes `input` (whatever MediaRecorder produced — webm/opus, mp4/aac,
 * ogg/opus), resamples to 16kHz mono, and encodes as a 16-bit PCM WAV Blob.
 * Throws AudioTooShortError/AudioTooLongError for out-of-range clips rather
 * than silently truncating or wasting an Azure call on unassessable audio.
 *
 * The decoded AudioBuffer is never retained past this call — nothing here
 * captures it in a closure or ref, so it's eligible for GC as soon as this
 * function returns.
 */
export async function normalizeToWav16kMono(input: Blob): Promise<NormalizedAudio> {
  const arrayBuffer = await input.arrayBuffer();

  // Decoding requires a context; a short-lived AudioContext (not Offline)
  // is used only for decodeAudioData, since OfflineAudioContext's own
  // decodeAudioData support is inconsistent across Safari versions. It is
  // closed immediately after decode, before the OfflineAudioContext used
  // for resampling is created — never overlapping with useMicLevel's live
  // context, and never held open longer than the decode call itself.
  const DecodeContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeContext = new DecodeContextCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeContext.decodeAudioData(arrayBuffer);
  } finally {
    await decodeContext.close().catch(() => {});
  }

  const durationSec = decoded.duration;
  if (durationSec < MIN_CLIP_DURATION_SEC) {
    throw new AudioTooShortError(durationSec);
  }
  if (durationSec > MAX_DECODE_DURATION_SEC) {
    throw new AudioTooLongError(durationSec);
  }

  const targetFrameCount = Math.ceil(durationSec * TARGET_SAMPLE_RATE);
  const OfflineAudioContextCtor =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const offlineContext = new OfflineAudioContextCtor(1, targetFrameCount, TARGET_SAMPLE_RATE);

  const source = offlineContext.createBufferSource();
  source.buffer = decoded;

  // Downmix to mono via a single-channel destination: OfflineAudioContext
  // itself performs the channel downmix (sum-and-average, per the Web Audio
  // spec's mixing rules) when the destination has fewer channels than the
  // source, so no manual channel-averaging loop is needed here.
  source.connect(offlineContext.destination);
  source.start(0);

  const resampled = await offlineContext.startRendering();
  const wavBlob = encodeWavPcm16(resampled);

  return { blob: wavBlob, durationSec, sampleRate: TARGET_SAMPLE_RATE };
}

/** Encodes a mono Float32 AudioBuffer as a 16-bit PCM WAV Blob. */
function encodeWavPcm16(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample; // mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createHttpPronunciationProvider } from '../providers/httpProvider';
import { PRONUNCIATION_GOLDEN_ASSESSMENT, buildPronunciationAssessment } from './fixtures';

// Fakes the two Web Audio contexts audioNormalizer.ts needs, so these tests
// exercise the real normalize-then-upload path (producing a WAV blob) rather
// than silently falling back to the raw blob because jsdom has no Web Audio
// support out of the box.
function installFakeWebAudio() {
  const fakeDecoded = {
    duration: 2.0,
    sampleRate: 48_000,
    numberOfChannels: 1,
    length: 96_000,
    getChannelData: () => new Float32Array(96_000),
  };

  class FakeAudioContext {
    async decodeAudioData() { return fakeDecoded; }
    async close() {}
  }

  class FakeOfflineAudioContext {
    destination = {};
    constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {}
    createBufferSource() {
      return { buffer: null, connect() {}, start() {} };
    }
    async startRendering() {
      return {
        duration: this.length / this.sampleRate,
        sampleRate: this.sampleRate,
        numberOfChannels: this.numberOfChannels,
        length: this.length,
        getChannelData: () => new Float32Array(this.length),
      };
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
}

describe('createHttpPronunciationProvider', () => {
  beforeEach(() => {
    installFakeWebAudio();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs FormData to /api/pronunciation and validates the response through the Zod schema', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => PRONUNCIATION_GOLDEN_ASSESSMENT,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    const result = await provider({
      audioBlob: new Blob(['fake'], { type: 'audio/webm' }),
      targetText: 'Un bon vin blanc.',
      languageCode: 'fr-FR',
    });

    expect(result).toEqual(PRONUNCIATION_GOLDEN_ASSESSMENT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/pronunciation');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('normalizes the recorded blob to WAV before upload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => PRONUNCIATION_GOLDEN_ASSESSMENT,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await provider({
      audioBlob: new Blob(['fake'], { type: 'audio/webm' }),
      targetText: 'Un bon vin blanc.',
      languageCode: 'fr-FR',
    });

    const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData = init.body as FormData;
    const uploaded = formData.get('audio') as File;
    expect(uploaded.name).toBe('recording.wav');
    expect(uploaded.type).toBe('audio/wav');
  });

  it('defaults to mode=scripted in the form data when mode is omitted', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => PRONUNCIATION_GOLDEN_ASSESSMENT,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await provider({
      audioBlob: new Blob(['fake'], { type: 'audio/webm' }),
      targetText: 'Un bon vin blanc.',
      languageCode: 'fr-FR',
    });

    const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData = init.body as FormData;
    expect(formData.get('mode')).toBe('scripted');
  });

  it('sends mode=freeform in the form data when requested', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => PRONUNCIATION_GOLDEN_ASSESSMENT,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await provider({
      audioBlob: new Blob(['fake'], { type: 'audio/webm' }),
      targetText: 'whatever the Web Speech API guessed',
      languageCode: 'fr-FR',
      mode: 'freeform',
    });

    const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData = init.body as FormData;
    expect(formData.get('mode')).toBe('freeform');
  });

  it('falls back to uploading the original blob when normalization fails', async () => {
    class ThrowingAudioContext {
      async decodeAudioData(): Promise<never> {
        throw new Error('unsupported codec');
      }
      async close() {}
    }
    vi.stubGlobal('AudioContext', ThrowingAudioContext);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => PRONUNCIATION_GOLDEN_ASSESSMENT,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    const result = await provider({
      audioBlob: new Blob(['fake'], { type: 'audio/webm' }),
      targetText: 'Un bon vin blanc.',
      languageCode: 'fr-FR',
    });

    expect(result).toEqual(PRONUNCIATION_GOLDEN_ASSESSMENT);
    const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData = init.body as FormData;
    const uploaded = formData.get('audio') as File;
    expect(uploaded.name).toBe('recording.webm');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await expect(
      provider({ audioBlob: new Blob(['x']), targetText: 'x', languageCode: 'fr-FR' }),
    ).rejects.toThrow('API pronunciation → 500');

    vi.unstubAllGlobals();
  });

  it('accepts an Azure-shaped payload with heard: null on a skipped word', async () => {
    const assessmentWithSkippedWord = buildPronunciationAssessment({
      issues: [
        {
          word: 'vin',
          ipaExpected: '',
          ipaHeard: '',
          problem: "'vin' was skipped",
          severity: 'medium',
          drill: { hint: "Practise 'vin' slowly, then say it in the full phrase.", repeatPhrase: 'Un bon vin blanc.' },
          expected: 'vin',
          heard: null,
        },
      ],
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => assessmentWithSkippedWord })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await expect(
      provider({ audioBlob: new Blob(['x']), targetText: 'Un bon vin blanc.', languageCode: 'fr-FR' }),
    ).resolves.toEqual(assessmentWithSkippedWord);

    vi.unstubAllGlobals();
  });

  it('accepts an Azure-shaped payload with phonemes and prosody', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => PRONUNCIATION_GOLDEN_ASSESSMENT })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    const result = await provider({
      audioBlob: new Blob(['x']),
      targetText: 'Un bon vin blanc.',
      languageCode: 'fr-FR',
    });

    expect(result.subScores?.prosody).toBe(88);
    const vinWord = result.words.find(w => w.word === 'vin');
    expect(vinWord?.phonemes).toEqual([
      { phoneme: 'v', accuracyScore: 92 },
      { phoneme: 'ɛ̃', accuracyScore: 38 },
    ]);

    vi.unstubAllGlobals();
  });

  it('tolerates unknown response keys (forward compatibility with a newer backend)', async () => {
    const payloadWithUnknownFields = {
      ...PRONUNCIATION_GOLDEN_ASSESSMENT,
      mode: 'freeform',
      locale: 'fr-FR',
      assessorVersion: 'pronunciation-v3',
      audioQuality: { snrDb: 32, durationMs: 4200, recognitionStatus: 'Success', clipped: false },
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => payloadWithUnknownFields })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await expect(
      provider({ audioBlob: new Blob(['x']), targetText: 'Un bon vin blanc.', languageCode: 'fr-FR' }),
    ).resolves.toMatchObject(PRONUNCIATION_GOLDEN_ASSESSMENT);

    vi.unstubAllGlobals();
  });

  it('accepts subScores.completeness: null (freeform mode)', async () => {
    const freeformAssessment = buildPronunciationAssessment({
      subScores: { accuracy: 82, fluency: 90, completeness: null, prosody: 88 },
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => freeformAssessment })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await expect(
      provider({ audioBlob: new Blob(['x']), targetText: 'Un bon vin blanc.', languageCode: 'fr-FR' }),
    ).resolves.toEqual(freeformAssessment);

    vi.unstubAllGlobals();
  });

  it('parses a full Phase 1 response shape (prosodyMetrics, phonologicalFindings, confidence, coaching)', async () => {
    const phase1Assessment = {
      ...PRONUNCIATION_GOLDEN_ASSESSMENT,
      mode: 'scripted' as const,
      locale: 'fr-FR',
      assessorVersion: 'pronunciation-v3',
      chunkCount: 2,
      chunksFailed: 0,
      prosodyMetrics: {
        speechRateWpm: 110,
        articulationRateSyllPerSec: 3.2,
        pauseCount: 3,
        longestPauseMs: 420,
        pauseRatio: 0.12,
        rhythmRegularity: 0.6,
        finalSyllableLengthening: true,
      },
      phonologicalFindings: [
        { category: 'liaison', word: 'les amis', explanation: 'missing liaison', confidence: 0.6, provenance: 'inferred' },
      ],
      audioQuality: { snrDb: 28, durationMs: 5200, recognitionStatus: 'Success', clipped: false },
      confidence: { overall: 0.82, basis: ['snr', 'transcriptAgreement'], transcriptAgreement: 0.95 },
      coaching: { summary: 'Solid overall.', topPriority: 'liaison', tips: ['Practise liaison before vowels.'], grounded: true },
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => phase1Assessment })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    const result = await provider({ audioBlob: new Blob(['x']), targetText: 'Un bon vin blanc.', languageCode: 'fr-FR' });

    expect(result.chunkCount).toBe(2);
    expect(result.prosodyMetrics?.speechRateWpm).toBe(110);
    expect(result.phonologicalFindings?.[0].category).toBe('liaison');
    expect(result.confidence?.overall).toBe(0.82);
    expect(result.coaching?.topPriority).toBe('liaison');

    vi.unstubAllGlobals();
  });

  it('accepts prosodyMetrics: null and phonologicalFindings: [] (unavailable per capability matrix)', async () => {
    const assessment = {
      ...PRONUNCIATION_GOLDEN_ASSESSMENT,
      prosodyMetrics: null,
      phonologicalFindings: [],
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => assessment })));

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    const result = await provider({ audioBlob: new Blob(['x']), targetText: 'x', languageCode: 'fr-FR' });

    expect(result.prosodyMetrics).toBeNull();
    expect(result.phonologicalFindings).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('throws when the response fails schema validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ score: 'not-a-number' }) })),
    );

    const provider = createHttpPronunciationProvider('http://localhost:8000');
    await expect(
      provider({ audioBlob: new Blob(['x']), targetText: 'x', languageCode: 'fr-FR' }),
    ).rejects.toThrow(/failed validation/);

    vi.unstubAllGlobals();
  });
});

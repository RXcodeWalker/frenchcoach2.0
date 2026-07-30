import { describe, expect, it, vi } from 'vitest';
import { createHttpPronunciationProvider } from '../providers/httpProvider';
import { PRONUNCIATION_GOLDEN_ASSESSMENT, buildPronunciationAssessment } from './fixtures';

describe('createHttpPronunciationProvider', () => {
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

    vi.unstubAllGlobals();
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

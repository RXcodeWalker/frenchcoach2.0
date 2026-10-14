// The Junior Whisper call (junior-track §2, Batch 4): its own purpose, never biased, never blocking.
import { describe, expect, it, vi } from 'vitest';
import { JUNIOR_TRANSCRIBE_TIMEOUT_MS, transcribeJuniorTurn, type JuniorTranscribe } from '../juniorTranscription';

const audio = new Blob(['x'], { type: 'audio/webm' });
const ok = (text: string, segments: { noSpeechProb: number | null; compressionRatio: number | null }[] = []) =>
  vi.fn<JuniorTranscribe>(async () => ({
    text, source: 'groq-whisper',
    segments: segments.map((s) => ({ startS: 0, endS: 1, text, avgLogprob: null, ...s })),
  }));

describe('transcribeJuniorTurn', () => {
  it('sends purpose junior with a short budget and NO prompt (never the expected sentence)', async () => {
    const transcribe = ok("J'aime le bleu.");
    expect(await transcribeJuniorTurn(audio, transcribe)).toBe("J'aime le bleu.");
    expect(transcribe).toHaveBeenCalledTimes(1);
    const [blob, language, options] = transcribe.mock.calls[0];
    expect(blob).toBe(audio);
    expect(language).toBe('fr');
    expect(options).toEqual({ purpose: 'junior', timeoutMs: JUNIOR_TRANSCRIBE_TIMEOUT_MS });
    expect(options).not.toHaveProperty('prompt');
  });

  it('makes no call without a recording', async () => {
    const transcribe = ok('x');
    expect(await transcribeJuniorTurn(null, transcribe)).toBeNull();
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('gives null on any failure, so the caller keeps Web Speech', async () => {
    for (const err of [new Error('Transcription request timed out'), new Error('consent'), new Error('429')]) {
      expect(await transcribeJuniorTurn(audio, vi.fn<JuniorTranscribe>(async () => { throw err; }))).toBeNull();
    }
  });

  it('gives null when the provider is unavailable or returns no text', async () => {
    const down = vi.fn<JuniorTranscribe>(async () => ({ text: '', source: 'transcription-unavailable', segments: [] }));
    expect(await transcribeJuniorTurn(audio, down)).toBeNull();
    expect(await transcribeJuniorTurn(audio, ok('   '))).toBeNull();
  });

  it('rejects text Whisper invents on silence or loops on — never a dishonest "got it"', async () => {
    expect(await transcribeJuniorTurn(audio, ok("J'aime le bleu.", [{ noSpeechProb: 0.9, compressionRatio: 1 }]))).toBeNull();
    expect(await transcribeJuniorTurn(audio, ok('bleu bleu bleu bleu bleu bleu', [{ noSpeechProb: 0.1, compressionRatio: 3 }]))).toBeNull();
  });
});

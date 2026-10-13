// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { ConsentRequiredError } from '../../../lib/consentRequired';
import { ApiHttpError, type TranscribeAudioResult } from '../../../services/api/apiClient';
import { LEARN_TRANSCRIBE_TIMEOUT_MS, buildTranscriptionPrompt, transcribeLearnAnswer } from '../answerTranscription';

const AUDIO = new Blob(['x'], { type: 'audio/webm' });
const QUESTION = 'Parle-moi de ta famille.';

const whisper = (text: string, extra: Partial<TranscribeAudioResult> = {}): TranscribeAudioResult => ({
  text,
  source: 'groq-whisper',
  segments: [{ start: 0, end: 2, text, avgLogprob: -0.2, noSpeechProb: 0.02, compressionRatio: 1.1 }],
  ...extra,
});

type Transcribe = NonNullable<Parameters<typeof transcribeLearnAnswer>[0]['transcribe']>;

const run = (transcribe: Transcribe, liveText = 'ils sont en chien', audio: Blob | null = AUDIO) =>
  transcribeLearnAnswer({ liveText, audio, questionText: QUESTION, earlierAnswers: [], transcribe });

describe('buildTranscriptionPrompt', () => {
  it('puts the question on the first line and earlier answers after it, oldest first', () => {
    expect(buildTranscriptionPrompt(QUESTION, ["J'ai un frère.", 'Il aime le foot.'])).toBe(
      `${QUESTION}\nJ'ai un frère.\nIl aime le foot.`,
    );
  });

  it('is just the question when there are no earlier answers', () => {
    expect(buildTranscriptionPrompt(`  ${QUESTION}  `, [])).toBe(QUESTION);
  });

  it('drops the oldest answers first to stay under the backend limit', () => {
    const answers = Array.from({ length: 30 }, (_, i) => `réponse numéro ${i} ${'mot '.repeat(10)}`.trim());
    const prompt = buildTranscriptionPrompt(QUESTION, answers);
    expect(prompt.length).toBeLessThanOrEqual(1000);
    expect(prompt.startsWith(QUESTION)).toBe(true);
    expect(prompt).toContain('réponse numéro 29');
    expect(prompt).not.toContain('réponse numéro 0 ');
  });

  it('contains nothing but the question and the student’s own answers', () => {
    expect(buildTranscriptionPrompt(QUESTION, [])).not.toMatch(/model|hint|vocab/i);
  });
});

describe('transcribeLearnAnswer', () => {
  it('makes Whisper primary and keeps the live captions as the second opinion', async () => {
    const transcribe = vi.fn().mockResolvedValue(whisper('Ils ont un chien.'));
    const result = await run(transcribe);
    expect(result).toEqual({ primaryText: 'Ils ont un chien.', secondaryText: 'ils sont en chien', source: 'whisper', fallbackReason: null });
  });

  it('sends the question as the prompt, the learn purpose and the 8 s budget', async () => {
    const transcribe = vi.fn().mockResolvedValue(whisper('Bonjour.'));
    await transcribeLearnAnswer({ liveText: 'bonjour', audio: AUDIO, questionText: QUESTION, earlierAnswers: ["J'ai un frère."], transcribe });
    expect(transcribe).toHaveBeenCalledWith(AUDIO, 'fr', {
      prompt: `${QUESTION}\nJ'ai un frère.`,
      purpose: 'learn',
      timeoutMs: LEARN_TRANSCRIBE_TIMEOUT_MS,
    });
  });

  it('uses the live captions when there is no audio, without calling the backend', async () => {
    const transcribe = vi.fn();
    expect(await run(transcribe, 'bonjour', null)).toEqual({
      primaryText: 'bonjour', secondaryText: '', source: 'live-captions', fallbackReason: 'no-audio',
    });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it.each([
    ['a network failure', new Error('boom'), 'asr-failed'],
    ['a timeout', new Error('Transcription request timed out'), 'asr-timeout'],
    ['the consent gate', new ConsentRequiredError(), 'consent'],
    ['the daily cap', new ApiHttpError('/api/transcribe', 429), 'quota'],
    ['a server error', new ApiHttpError('/api/transcribe', 503), 'asr-failed'],
  ])('falls back to the live captions after %s', async (_label, error, reason) => {
    const result = await run(vi.fn().mockRejectedValue(error), 'ils sont en chien');
    expect(result).toEqual({ primaryText: 'ils sont en chien', secondaryText: '', source: 'live-captions', fallbackReason: reason });
  });

  it('falls back when the backend reports transcription as unavailable', async () => {
    const result = await run(vi.fn().mockResolvedValue({ text: '', source: 'transcription-unavailable', segments: [] }));
    expect(result).toMatchObject({ source: 'live-captions', fallbackReason: 'asr-failed' });
  });

  it('falls back when Whisper heard nothing', async () => {
    const result = await run(vi.fn().mockResolvedValue(whisper('   ')));
    expect(result).toMatchObject({ primaryText: 'ils sont en chien', source: 'live-captions', fallbackReason: 'asr-rejected' });
  });

  it('falls back when Whisper’s own confidence says the audio was not speech', async () => {
    const hallucination = whisper('Sous-titres réalisés par la communauté', {
      segments: [{ start: 0, end: 2, text: 'x', avgLogprob: -1, noSpeechProb: 0.95, compressionRatio: 1 }],
    });
    const result = await run(vi.fn().mockResolvedValue(hallucination), '');
    expect(result).toMatchObject({ primaryText: '', source: 'live-captions', fallbackReason: 'asr-rejected' });
  });
});

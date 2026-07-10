import { describe, expect, it, vi } from 'vitest';
import { createJudgeWithFallback } from '../judgeFactory';
import type { GeminiClientLike } from '../geminiJudge';
import type { GroqClientLike } from '../groqJudge';

function geminiClient(behavior: 'succeed' | 'fail', text = '{"ok":true}'): GeminiClientLike {
  return {
    models: {
      generateContent: vi.fn(async () => {
        if (behavior === 'fail') throw new Error('gemini: rate limited');
        return { text, responseId: 'gemini-resp-1' };
      }),
    },
  };
}

function groqClient(behavior: 'succeed' | 'fail', content = '{"ok":true}'): GroqClientLike {
  return {
    chat: {
      completions: {
        create: vi.fn(async () => {
          if (behavior === 'fail') throw new Error('groq: also down');
          return { id: 'groq-resp-1', choices: [{ message: { content } }] };
        }),
      },
    },
  };
}

describe('createJudgeWithFallback', () => {
  it('uses Gemini and never calls Groq when Gemini succeeds', async () => {
    const gemini = geminiClient('succeed');
    const groq = groqClient('succeed');
    const { judge, getLastCallMetadata } = createJudgeWithFallback({
      gemini: { client: gemini },
      groq: { client: groq },
    });

    const result = await judge({ prompt: 'hello' });

    expect(result).toEqual({ raw: '{"ok":true}' });
    expect(gemini.models.generateContent).toHaveBeenCalledOnce();
    expect(groq.chat.completions.create).not.toHaveBeenCalled();
    expect(getLastCallMetadata()).toEqual({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      responseId: 'gemini-resp-1',
    });
  });

  it('falls back to Groq only when the Gemini call itself throws (request failure)', async () => {
    const gemini = geminiClient('fail');
    const groq = groqClient('succeed', '{"fallback":true}');
    const { judge, getLastCallMetadata } = createJudgeWithFallback({
      gemini: { client: gemini },
      groq: { client: groq },
    });

    const result = await judge({ prompt: 'hello' });

    expect(result).toEqual({ raw: '{"fallback":true}' });
    expect(gemini.models.generateContent).toHaveBeenCalledOnce();
    expect(groq.chat.completions.create).toHaveBeenCalledOnce();
    expect(getLastCallMetadata()).toEqual({
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      responseId: 'groq-resp-1',
    });
  });

  it('only one provider scores a given attempt — never both concurrently', async () => {
    const gemini = geminiClient('succeed');
    const groq = groqClient('succeed');
    const { judge } = createJudgeWithFallback({ gemini: { client: gemini }, groq: { client: groq } });

    await judge({ prompt: 'hello' });

    const geminiCalls = (gemini.models.generateContent as ReturnType<typeof vi.fn>).mock.calls.length;
    const groqCalls = (groq.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(geminiCalls + groqCalls).toBe(1);
  });

  it('throws a combined error when both Gemini and Groq fail', async () => {
    const gemini = geminiClient('fail');
    const groq = groqClient('fail');
    const { judge } = createJudgeWithFallback({ gemini: { client: gemini }, groq: { client: groq } });

    await expect(judge({ prompt: 'hello' })).rejects.toThrow(/rate limited.*also down/s);
  });

  it('does not fall back to Groq for a low-quality (but successful) Gemini response', async () => {
    // A successful call that returns garbage is NOT a request failure — scoreSpeaking's
    // JSON.parse/validation happens downstream of this judge, so this composite
    // judge must not retry or fall back just because the content looks wrong.
    const gemini = geminiClient('succeed', 'not json at all');
    const groq = groqClient('succeed');
    const { judge } = createJudgeWithFallback({ gemini: { client: gemini }, groq: { client: groq } });

    const result = await judge({ prompt: 'hello' });

    expect(result).toEqual({ raw: 'not json at all' });
    expect(groq.chat.completions.create).not.toHaveBeenCalled();
  });

  it('produces independent metadata across concurrent fresh factory invocations', async () => {
    const factories = Array.from({ length: 5 }, (_, i) => {
      const gemini = geminiClient('succeed', `{"n":${i}}`);
      const groq = groqClient('succeed');
      return createJudgeWithFallback({ gemini: { client: gemini }, groq: { client: groq } });
    });

    const results = await Promise.all(factories.map((f) => f.judge({ prompt: 'p' })));
    results.forEach((r, i) => expect(r).toEqual({ raw: `{"n":${i}}` }));

    factories.forEach((f) => {
      expect(f.getLastCallMetadata()?.provider).toBe('gemini');
    });
  });
});

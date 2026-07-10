import { describe, expect, it, vi } from 'vitest';
import { createGeminiJudge } from '../geminiJudge';
import type { GeminiClientLike } from '../geminiJudge';

function fakeGeminiClient(text: string, responseId = 'resp_fake'): GeminiClientLike {
  const generateContent = vi.fn(async () => ({
    text,
    responseId,
  }));
  return { models: { generateContent } };
}

describe('createGeminiJudge', () => {
  it('sends the default model and prompt as contents', async () => {
    const client = fakeGeminiClient('{"ok":true}');
    const { judge } = createGeminiJudge({ client });

    await judge({ prompt: 'hello' });

    expect(client.models.generateContent).toHaveBeenCalledOnce();
    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.model).toBe('gemini-2.5-flash-lite');
    expect(call.contents).toBe('hello');
  });

  it('returns response.text as JudgeResponse', async () => {
    const client = fakeGeminiClient('{"result":"x"}');
    const { judge } = createGeminiJudge({ client });

    const result = await judge({ prompt: 'p' });

    expect(result).toEqual({ raw: '{"result":"x"}' });
  });

  it('captures model/responseId via getLastCallMetadata after the call', async () => {
    const client = fakeGeminiClient('{}', 'resp_abc123');
    const { judge, getLastCallMetadata } = createGeminiJudge({ client });

    expect(getLastCallMetadata()).toBeUndefined();
    await judge({ prompt: 'p' });

    expect(getLastCallMetadata()).toEqual({ model: 'gemini-2.5-flash-lite', responseId: 'resp_abc123' });
  });

  it('respects a custom model option', async () => {
    const client = fakeGeminiClient('{}');
    const { judge, getLastCallMetadata } = createGeminiJudge({ client, model: 'gemini-2.5-pro' });

    await judge({ prompt: 'p' });

    expect((client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0].model).toBe(
      'gemini-2.5-pro',
    );
    expect(getLastCallMetadata()?.model).toBe('gemini-2.5-pro');
  });

  it('throws if the response contains no text', async () => {
    const client: GeminiClientLike = {
      models: { generateContent: vi.fn(async () => ({ text: undefined, responseId: 'resp_x' })) },
    };
    const { judge } = createGeminiJudge({ client });

    await expect(judge({ prompt: 'p' })).rejects.toThrow(/no text/);
  });
});

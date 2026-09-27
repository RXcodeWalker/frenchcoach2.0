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

    await judge({ kind: 'rolePlayCommunication', prompt: 'hello' });

    expect(client.models.generateContent).toHaveBeenCalledOnce();
    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.model).toBe('gemini-3.5-flash-lite');
    expect(call.contents).toBe('hello');
  });

  it('returns response.text as JudgeResponse', async () => {
    const client = fakeGeminiClient('{"result":"x"}');
    const { judge } = createGeminiJudge({ client });

    const result = await judge({ kind: 'rolePlayCommunication', prompt: 'p' });

    expect(result).toEqual({ raw: '{"result":"x"}' });
  });

  it('captures model/responseId via getLastCallMetadata after the call', async () => {
    const client = fakeGeminiClient('{}', 'resp_abc123');
    const { judge, getLastCallMetadata } = createGeminiJudge({ client });

    expect(getLastCallMetadata()).toBeUndefined();
    await judge({ kind: 'rolePlayCommunication', prompt: 'p' });

    expect(getLastCallMetadata()).toEqual({ model: 'gemini-3.5-flash-lite', responseId: 'resp_abc123' });
  });

  it('respects a custom model option', async () => {
    const client = fakeGeminiClient('{}');
    const { judge, getLastCallMetadata } = createGeminiJudge({ client, model: 'gemini-2.5-pro' });

    await judge({ kind: 'rolePlayCommunication', prompt: 'p' });

    expect((client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0].model).toBe(
      'gemini-2.5-pro',
    );
    expect(getLastCallMetadata()?.model).toBe('gemini-2.5-pro');
  });

  it('sends a maxOutputTokens cap and a request timeout, not left to provider defaults (reliability plan §2.5)', async () => {
    const client = fakeGeminiClient('{}');
    const { judge } = createGeminiJudge({ client });

    await judge({ kind: 'rolePlayCommunication', prompt: 'p' });

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.config?.maxOutputTokens).toBeGreaterThan(0);
    expect(call.config?.httpOptions?.timeout).toBeGreaterThan(0);
  });

  it('requests JSON mode so the reply is not wrapped in a markdown fence', async () => {
    const client = fakeGeminiClient('{}');
    const { judge } = createGeminiJudge({ client });

    await judge({ kind: 'rolePlayCommunication', prompt: 'p' });

    const call = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.config?.responseMimeType).toBe('application/json');
  });

  it('captures token usage via getLastCallMetadata when the response carries usageMetadata (step 9)', async () => {
    const generateContent = vi.fn(async () => ({
      text: '{}',
      responseId: 'resp_usage',
      usageMetadata: { promptTokenCount: 1234, candidatesTokenCount: 567, totalTokenCount: 1801 },
    }));
    const client: GeminiClientLike = { models: { generateContent } };
    const { judge, getLastCallMetadata } = createGeminiJudge({ client });

    await judge({ kind: 'qualityOfLanguage', prompt: 'p' });

    expect(getLastCallMetadata()?.usage).toEqual({ inputTokens: 1234, outputTokens: 567, totalTokens: 1801 });
  });

  it('omits usage when the response carries no usageMetadata', async () => {
    const client = fakeGeminiClient('{}');
    const { judge, getLastCallMetadata } = createGeminiJudge({ client });

    await judge({ kind: 'rolePlayCommunication', prompt: 'p' });

    expect(getLastCallMetadata()?.usage).toBeUndefined();
  });

  it('throws if the response contains no text', async () => {
    const client: GeminiClientLike = {
      models: { generateContent: vi.fn(async () => ({ text: undefined, responseId: 'resp_x' })) },
    };
    const { judge } = createGeminiJudge({ client });

    await expect(judge({ kind: 'rolePlayCommunication', prompt: 'p' })).rejects.toThrow(/no text/);
  });
});

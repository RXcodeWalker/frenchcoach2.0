import { describe, expect, it, vi } from 'vitest';
import { createGroqJudge } from '../groqJudge';
import type { GroqClientLike } from '../groqJudge';

function fakeGroqClient(content: string, id = 'chatcmpl_fake'): GroqClientLike {
  const create = vi.fn(async () => ({
    id,
    choices: [{ message: { content } }],
  }));
  return { chat: { completions: { create } } };
}

describe('createGroqJudge', () => {
  it('sends the default model and prompt as a user message', async () => {
    const client = fakeGroqClient('{"ok":true}');
    const { judge } = createGroqJudge({ client });

    await judge({ prompt: 'hello' });

    expect(client.chat.completions.create).toHaveBeenCalledOnce();
    const call = (client.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.model).toBe('llama-3.3-70b-versatile');
    expect(call.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('returns the message content as JudgeResponse', async () => {
    const client = fakeGroqClient('{"result":"x"}');
    const { judge } = createGroqJudge({ client });

    const result = await judge({ prompt: 'p' });

    expect(result).toEqual({ raw: '{"result":"x"}' });
  });

  it('captures model/responseId via getLastCallMetadata after the call', async () => {
    const client = fakeGroqClient('{}', 'chatcmpl_abc123');
    const { judge, getLastCallMetadata } = createGroqJudge({ client });

    expect(getLastCallMetadata()).toBeUndefined();
    await judge({ prompt: 'p' });

    expect(getLastCallMetadata()).toEqual({ model: 'llama-3.3-70b-versatile', responseId: 'chatcmpl_abc123' });
  });

  it('respects a custom model option', async () => {
    const client = fakeGroqClient('{}');
    const { judge, getLastCallMetadata } = createGroqJudge({ client, model: 'llama-3.1-8b-instant' });

    await judge({ prompt: 'p' });

    expect(
      (client.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0].model,
    ).toBe('llama-3.1-8b-instant');
    expect(getLastCallMetadata()?.model).toBe('llama-3.1-8b-instant');
  });

  it('throws if the response contains no message content', async () => {
    const client: GroqClientLike = {
      chat: { completions: { create: vi.fn(async () => ({ id: 'x', choices: [{ message: { content: null } }] })) } },
    };
    const { judge } = createGroqJudge({ client });

    await expect(judge({ prompt: 'p' })).rejects.toThrow(/no message content/);
  });
});

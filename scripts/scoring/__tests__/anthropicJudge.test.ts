import { describe, expect, it, vi } from 'vitest';
import { createAnthropicJudge } from '../anthropicJudge';

interface FakeCreateParams {
  model: string;
  thinking?: unknown;
  output_config?: unknown;
  messages: unknown;
  [key: string]: unknown;
}

function fakeAnthropicClient(responseText: string, responseId = 'msg_fake') {
  const create = vi.fn(async (_params: FakeCreateParams) => ({
    id: responseId,
    content: [{ type: 'text', text: responseText }],
  }));
  return { messages: { create } };
}

describe('createAnthropicJudge', () => {
  it('sends model, adaptive thinking, effort, and no sampling params', async () => {
    const client = fakeAnthropicClient('{"ok":true}');
    const { judge } = createAnthropicJudge({ client: client as any });

    await judge({ prompt: 'hello' });

    expect(client.messages.create).toHaveBeenCalledOnce();
    const call = client.messages.create.mock.calls[0][0];
    expect(call.model).toBe('claude-opus-4-8');
    expect(call.thinking).toEqual({ type: 'adaptive' });
    expect(call.output_config).toEqual({ effort: 'high' });
    expect(call).not.toHaveProperty('temperature');
    expect(call).not.toHaveProperty('top_p');
    expect(call).not.toHaveProperty('top_k');
    expect(call.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('returns the raw text block as JudgeResponse', async () => {
    const client = fakeAnthropicClient('{"result":"x"}');
    const { judge } = createAnthropicJudge({ client: client as any });

    const result = await judge({ prompt: 'p' });

    expect(result).toEqual({ raw: '{"result":"x"}' });
  });

  it('captures model/effort/responseId via getLastCallMetadata after the call', async () => {
    const client = fakeAnthropicClient('{}', 'msg_abc123');
    const { judge, getLastCallMetadata } = createAnthropicJudge({
      client: client as any,
      effort: 'xhigh',
    });

    expect(getLastCallMetadata()).toBeUndefined();
    await judge({ prompt: 'p' });

    expect(getLastCallMetadata()).toEqual({
      model: 'claude-opus-4-8',
      effort: 'xhigh',
      responseId: 'msg_abc123',
    });
  });

  it('respects a custom model option', async () => {
    const client = fakeAnthropicClient('{}');
    const { judge, getLastCallMetadata } = createAnthropicJudge({
      client: client as any,
      model: 'claude-sonnet-5',
    });

    await judge({ prompt: 'p' });

    expect(client.messages.create.mock.calls[0][0].model).toBe('claude-sonnet-5');
    expect(getLastCallMetadata()?.model).toBe('claude-sonnet-5');
  });

  it('throws if the response contains no text block', async () => {
    const client = {
      messages: { create: vi.fn(async () => ({ id: 'msg_x', content: [{ type: 'thinking', thinking: '' }] })) },
    };
    const { judge } = createAnthropicJudge({ client: client as any });

    await expect(judge({ prompt: 'p' })).rejects.toThrow(/no text block/);
  });
});

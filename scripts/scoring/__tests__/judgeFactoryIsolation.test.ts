/**
 * S4 post-review test: proves createAnthropicJudge()'s fresh-per-attempt factory
 * pattern prevents cross-attempt metadata bleed, sequentially and concurrently.
 */

import { describe, expect, it, vi } from 'vitest';
import { createAnthropicJudge } from '../anthropicJudge';

function fakeClientReturning(responseId: string, delayMs = 0) {
  return {
    messages: {
      create: vi.fn(async () => {
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        return { id: responseId, content: [{ type: 'text', text: '{}' }] };
      }),
    },
  };
}

describe('createAnthropicJudge factory isolation', () => {
  it('sequential: two fresh createAnthropicJudge() calls never bleed metadata', async () => {
    const clientA = fakeClientReturning('msg_A');
    const { judge: judgeA, getLastCallMetadata: metaA } = createAnthropicJudge({
      client: clientA as any,
      model: 'model-A',
    });
    await judgeA({ prompt: 'p1' });

    const clientB = fakeClientReturning('msg_B');
    const { judge: judgeB, getLastCallMetadata: metaB } = createAnthropicJudge({
      client: clientB as any,
      model: 'model-B',
    });
    await judgeB({ prompt: 'p2' });

    expect(metaA()).toEqual({ model: 'model-A', effort: 'high', responseId: 'msg_A' });
    expect(metaB()).toEqual({ model: 'model-B', effort: 'high', responseId: 'msg_B' });
  });

  it('concurrent: fresh instances via Promise.all never bleed metadata across attempts', async () => {
    const clientA = fakeClientReturning('msg_concurrent_A', 20);
    const clientB = fakeClientReturning('msg_concurrent_B', 5);

    const factoryA = createAnthropicJudge({ client: clientA as any, model: 'model-A' });
    const factoryB = createAnthropicJudge({ client: clientB as any, model: 'model-B' });

    await Promise.all([factoryA.judge({ prompt: 'p1' }), factoryB.judge({ prompt: 'p2' })]);

    expect(factoryA.getLastCallMetadata()).toEqual({
      model: 'model-A',
      effort: 'high',
      responseId: 'msg_concurrent_A',
    });
    expect(factoryB.getLastCallMetadata()).toEqual({
      model: 'model-B',
      effort: 'high',
      responseId: 'msg_concurrent_B',
    });
  });
});

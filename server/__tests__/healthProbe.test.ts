import { describe, expect, it, vi } from 'vitest';
import { createTtlCache, probeGroq, probeGemini } from '../healthProbe';

describe('createTtlCache', () => {
  it('serves a cached value until its TTL expires, using the injected clock', () => {
    let now = 0;
    const cache = createTtlCache<string>(() => now);

    cache.set('ok', 60_000);
    expect(cache.get()).toBe('ok');

    now = 59_999;
    expect(cache.get()).toBe('ok');

    now = 60_000;
    expect(cache.get()).toBeUndefined();
  });

  it('supports a shorter TTL for a degraded result', () => {
    let now = 0;
    const cache = createTtlCache<string>(() => now);

    cache.set('degraded', 5_000);
    now = 4_999;
    expect(cache.get()).toBe('degraded');

    now = 5_000;
    expect(cache.get()).toBeUndefined();
  });
});

describe('probeGroq', () => {
  it('returns degraded on a model_not_found-shaped error without throwing', async () => {
    const client = { models: { retrieve: vi.fn().mockRejectedValue(new Error('model_not_found')) } };
    await expect(probeGroq(client, 'bad-model')).resolves.toBe('degraded');
  });

  it('returns ok when the model resolves', async () => {
    const client = { models: { retrieve: vi.fn().mockResolvedValue({ id: 'good-model' }) } };
    await expect(probeGroq(client, 'good-model')).resolves.toBe('ok');
  });
});

describe('probeGemini', () => {
  it('returns degraded on a model_not_found-shaped error without throwing', async () => {
    const client = { models: { get: vi.fn().mockRejectedValue(new Error('model_not_found')) } };
    await expect(probeGemini(client, 'bad-model')).resolves.toBe('degraded');
  });

  it('returns ok when the model resolves', async () => {
    const client = { models: { get: vi.fn().mockResolvedValue({ name: 'good-model' }) } };
    await expect(probeGemini(client, 'good-model')).resolves.toBe('ok');
  });
});

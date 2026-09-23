/**
 * Metadata-only provider health probes for /health. Deliberately does NOT run
 * inference (no generateContent/chat.completions.create) — validates that the
 * configured model ID resolves via each SDK's cheap metadata endpoint:
 *   - Groq: client.models.list(), then match the ID. Not models.retrieve():
 *     groq-sdk URL-encodes the path, so a slashed ID like
 *     "openai/gpt-oss-120b" becomes openai%2F… and always 404s.
 *   - Gemini: ai.models.get({ model })
 * Mirrors backend/main.py's /health cache split (60s on success, 5s on
 * failure) so a transient blip re-probes soon but a healthy result isn't
 * re-checked on every poll.
 */

export interface ProviderProbeStatus {
  groq: 'ok' | 'degraded' | 'not_configured';
  gemini: 'ok' | 'degraded' | 'not_configured';
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function createTtlCache<T>(now: () => number = Date.now) {
  let entry: CacheEntry<T> | undefined;

  return {
    get(): T | undefined {
      if (entry && now() < entry.expiresAt) return entry.value;
      return undefined;
    },
    set(value: T, ttlMs: number): void {
      entry = { value, expiresAt: now() + ttlMs };
    },
  };
}

export interface GroqListClient {
  models: { list: () => Promise<{ data: Array<{ id: string }> }> };
}

export interface GeminiGetClient {
  models: { get: (params: { model: string }) => Promise<unknown> };
}

export async function probeGroq(client: GroqListClient, model: string): Promise<'ok' | 'degraded'> {
  try {
    const { data } = await client.models.list();
    if (data.some((m) => m.id === model)) return 'ok';
    console.error(`[health] groq model "${model}" not in this key's model list`);
    return 'degraded';
  } catch (err) {
    console.error(`[health] groq model check failed for "${model}":`, err instanceof Error ? err.message : err);
    return 'degraded';
  }
}

export async function probeGemini(client: GeminiGetClient, model: string): Promise<'ok' | 'degraded'> {
  try {
    await client.models.get({ model });
    return 'ok';
  } catch (err) {
    console.error(`[health] gemini model check failed for "${model}":`, err instanceof Error ? err.message : err);
    return 'degraded';
  }
}

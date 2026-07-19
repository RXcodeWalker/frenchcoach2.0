import { useState, useEffect, useCallback } from 'react';
import type { EngineHealth } from '../types';

export interface EngineHealthState {
  gemini: EngineHealth;
  groq: EngineHealth;
  offline: EngineHealth;
}

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json)
// to avoid CORS. Dev: call the backend directly.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');
const HEALTH_TIMEOUT_MS = 4000;

async function pingEngine(engine: 'gemini' | 'groq'): Promise<EngineHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/health?engine=${engine}`, {
      signal: controller.signal,
      method: 'GET',
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const status: string = data?.engines?.[engine] ?? 'healthy';
      if (status === 'degraded') return 'degraded';
      if (status === 'unavailable' || status === 'down') return 'unavailable';
      return 'healthy';
    }
    // 5xx → degraded, 4xx auth error → treat as healthy (backend up, just not authed)
    return res.status >= 500 ? 'degraded' : 'healthy';
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') return 'degraded';
    return 'unavailable';
  }
}

export function useEngineHealth(): EngineHealthState {
  const [health, setHealth] = useState<EngineHealthState>({
    gemini: 'checking',
    groq: 'checking',
    offline: 'healthy',
  });

  const check = useCallback(async () => {
    setHealth(prev => ({ ...prev, gemini: 'checking', groq: 'checking' }));
    const [geminiStatus, groqStatus] = await Promise.all([
      pingEngine('gemini'),
      pingEngine('groq'),
    ]);
    setHealth({ gemini: geminiStatus, groq: groqStatus, offline: 'healthy' });
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return health;
}

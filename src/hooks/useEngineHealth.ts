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

// Backend's /health probes both engines in a single call (60s-cached) — there is
// no per-engine query param, so one fetch covers both statuses.
function mapProbeStatus(status: string | undefined): EngineHealth {
  if (status === 'ok') return 'healthy';
  if (status === 'degraded') return 'degraded';
  if (status === 'not_configured') return 'unavailable';
  return 'unavailable';
}

async function pingEngines(): Promise<{ gemini: EngineHealth; groq: EngineHealth }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
      method: 'GET',
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        gemini: mapProbeStatus(data?.gemini),
        groq: mapProbeStatus(data?.groq),
      };
    }
    // 5xx → degraded (backend up but unwell); other non-OK → unavailable
    const status: EngineHealth = res.status >= 500 ? 'degraded' : 'unavailable';
    return { gemini: status, groq: status };
  } catch (err) {
    clearTimeout(timer);
    const status: EngineHealth = (err as Error).name === 'AbortError' ? 'degraded' : 'unavailable';
    return { gemini: status, groq: status };
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
    const { gemini, groq } = await pingEngines();
    setHealth({ gemini, groq, offline: 'healthy' });
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return health;
}

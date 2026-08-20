import { useState, useEffect, useRef } from 'react';
import type { EngineHealth } from '../types';
import { getWarmupPhase } from '../services/api/backendWarmup';

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
// Recheck fast while anything is unhealthy (e.g. a Render cold start warming up)
// so the UI self-heals within a few polls instead of staying stuck until reload.
// Once everything is healthy, back off to a slow poll that just watches for regressions.
const RECHECK_UNHEALTHY_MS = 5000;
const RECHECK_HEALTHY_MS = 60000;

// Backend's /health probes both engines in a single call (60s-cached) — there is
// no per-engine query param, so one fetch covers both statuses.
function mapProbeStatus(status: string | undefined): EngineHealth {
  if (status === 'ok') return 'healthy';
  if (status === 'degraded') return 'degraded';
  if (status === 'not_configured') return 'unavailable';
  return 'unavailable';
}

/**
 * A failed probe while the app is still waking a sleeping Render instance is a
 * cold start, not an outage — report it as 'checking' so the card doesn't
 * flash "unavailable" for the first half-minute after load.
 */
function failureStatus(onSettled: EngineHealth): EngineHealth {
  return getWarmupPhase() === 'warming' ? 'checking' : onSettled;
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
    const status: EngineHealth = res.status >= 500 ? 'degraded' : failureStatus('unavailable');
    return { gemini: status, groq: status };
  } catch (err) {
    clearTimeout(timer);
    const status: EngineHealth =
      (err as Error).name === 'AbortError' ? 'degraded' : failureStatus('unavailable');
    return { gemini: status, groq: status };
  }
}

export function useEngineHealth(): EngineHealthState {
  const [health, setHealth] = useState<EngineHealthState>({
    gemini: 'checking',
    groq: 'checking',
    offline: 'healthy',
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async (isFirstCheck: boolean) => {
      // Only show the "checking" state on the very first probe — once we have a
      // real reading, background re-polls should update silently instead of
      // flickering the whole card back to "checking" every few seconds.
      if (isFirstCheck) {
        setHealth(prev => ({ ...prev, gemini: 'checking', groq: 'checking' }));
      }
      const { gemini, groq } = await pingEngines();
      if (!mountedRef.current) return;
      setHealth({ gemini, groq, offline: 'healthy' });
      const allHealthy = gemini === 'healthy' && groq === 'healthy';
      timer = setTimeout(() => run(false), allHealthy ? RECHECK_HEALTHY_MS : RECHECK_UNHEALTHY_MS);
    };

    run(true);

    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return health;
}

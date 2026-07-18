/**
 * C1/A8/A9 — browser client for the Render Cambridge scoring service
 * (server/index.ts). Mirrors adminApi.ts's auth pattern (Supabase access
 * token as Bearer) but talks to a separate deployable — VITE_SCORING_API_URL,
 * not VITE_API_URL (FastAPI). The two services never call each other.
 */

import { supabase } from '../../lib/supabase';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import type { EnvelopeView } from '../../domain/igcse/envelope/envelopeView';

const SCORING_API_BASE = (import.meta.env.VITE_SCORING_API_URL as string | undefined) ?? '';

/** A9: client-side cap on POST /score. The server keeps scoring past this — see loadScoredEnvelope. */
const SCORE_TIMEOUT_MS = 90_000;

export class ScoringApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ScoringApiError';
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** A8: fire-and-forget wake-up ping. Never throws — a failed ping just means the cold start happens on the real request instead. */
export function pingScoringServiceHealth(): void {
  if (!SCORING_API_BASE) return;
  void fetch(`${SCORING_API_BASE}/health`).catch(() => undefined);
}

/**
 * A9: POST the transcript for scoring, aborting client-side after
 * SCORE_TIMEOUT_MS. A timeout here does NOT mean scoring failed — the
 * server keeps working and persists the envelope (never aborts on
 * disconnect, per server/index.ts's header) — so the caller's Retry path
 * should call loadScoredEnvelope, which hits the idempotency fast path.
 */
export async function scoreExamTranscript(transcript: SessionTranscript): Promise<EnvelopeView> {
  if (!SCORING_API_BASE) {
    throw new ScoringApiError('Scoring service is not configured (VITE_SCORING_API_URL unset)');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCORE_TIMEOUT_MS);

  try {
    const res = await fetch(`${SCORING_API_BASE}/score`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(transcript),
      signal: controller.signal,
    });
    return await parseEnvelopeResponse(res);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ScoringApiError('Scoring is taking longer than expected. The session may still finish scoring in the background — try again in a moment.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Used by the Retry path and by "navigated away and came back" (A2's GET /score). 404 means no envelope exists yet. */
export async function loadScoredEnvelope(sessionId: string): Promise<EnvelopeView | null> {
  if (!SCORING_API_BASE) return null;

  const res = await fetch(`${SCORING_API_BASE}/score?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: await authHeaders(),
  });
  if (res.status === 404) return null;
  return parseEnvelopeResponse(res);
}

async function parseEnvelopeResponse(res: Response): Promise<EnvelopeView> {
  if (!res.ok) {
    let message = `Scoring request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default message */
    }
    throw new ScoringApiError(message, res.status);
  }
  return res.json() as Promise<EnvelopeView>;
}

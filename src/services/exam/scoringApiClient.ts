/**
 * C1/A8/A9 — browser client for the Render Cambridge scoring service
 * (server/index.ts). Mirrors adminApi.ts's auth pattern (Supabase access
 * token as Bearer) but talks to a separate deployable — VITE_SCORING_API_URL,
 * not VITE_API_URL (FastAPI). The two services never call each other.
 *
 * Reliability plan §B: GET /score is now 3-way (done / in_progress / not_found),
 * matching server/index.ts's staleness-based recovery design — see
 * pollScoreStatus. The exam-scoring state machine (examScoringMachine.ts)
 * is the only caller that should interpret these results; ExamMode.tsx
 * drives the machine, not this client directly.
 */

import { supabase } from '../../lib/supabase';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import type { EnvelopeView } from '../../domain/igcse/envelope/envelopeView';

const SCORING_API_BASE = (import.meta.env.VITE_SCORING_API_URL as string | undefined) ?? '';

/** A9: client-side cap on POST /score. The server keeps scoring past this — see pollScoreStatus. */
const SCORE_TIMEOUT_MS = 90_000;

export class ScoringApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ScoringApiError';
  }
}

/** True for a status that will never succeed by repeating the same request unchanged. */
export function isTerminalScoringStatus(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403 || status === 409;
}

export type ScoreStatus =
  | { status: 'done'; envelope: EnvelopeView }
  | { status: 'in_progress' }
  | { status: 'not_found' };

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
 * SCORE_TIMEOUT_MS. A timeout or network error here does NOT mean scoring
 * failed — the server may still be working (never aborts on disconnect, per
 * server/index.ts's header) — so the caller (the WaitingForScore state)
 * follows up with pollScoreStatus rather than assuming failure.
 *
 * A 202 response (§A's in-flight dedup — a non-stale attempt already
 * underway) is treated the same as an ambiguous outcome: the caller should
 * move to WaitingForScore/poll, not treat it as done or as an error.
 */
export async function submitForScoring(transcript: SessionTranscript): Promise<ScoreStatus> {
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
    if (res.status === 202) return { status: 'in_progress' };
    const envelope = await parseEnvelopeResponse(res);
    return { status: 'done', envelope };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ScoringApiError('Scoring is taking longer than expected. The session may still finish scoring in the background — checking again shortly.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reliability plan §A/§B: the 3-way read behind WaitingForScore/Recovering.
 * 200 -> done, 202 -> in_progress (a recent attempt exists, keep polling,
 * never re-POST), 404 -> not_found (safe, and the only case where it's
 * meaningful, to resubmit). Any other non-ok status throws ScoringApiError
 * (terminal 4xx handled by isTerminalScoringStatus, or an unexpected 5xx).
 */
export async function pollScoreStatus(sessionId: string): Promise<ScoreStatus> {
  if (!SCORING_API_BASE) {
    throw new ScoringApiError('Scoring service is not configured (VITE_SCORING_API_URL unset)');
  }

  const res = await fetch(`${SCORING_API_BASE}/score?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: await authHeaders(),
  });
  if (res.status === 404) return { status: 'not_found' };
  if (res.status === 202) return { status: 'in_progress' };
  const envelope = await parseEnvelopeResponse(res);
  return { status: 'done', envelope };
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

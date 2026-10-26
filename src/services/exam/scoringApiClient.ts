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
import { trackQuotaHit } from '../telemetry/quotaHit';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import type { EnvelopeView } from '../../domain/igcse/envelope/envelopeView';
import type { ExamFeedbackReport } from '../../domain/examFeedback/types';
import { isExamFeedbackReport } from '../../domain/examFeedback/schema';

const SCORING_API_BASE = (import.meta.env.VITE_SCORING_API_URL as string | undefined) ?? '';

/** A9: client-side cap on POST /score. The server keeps scoring past this — see pollScoreStatus. */
const SCORE_TIMEOUT_MS = 90_000;

/**
 * Reliability plan §2.5: cap on a single GET /score poll, so a hung request
 * can never block the Recovering effect from re-running (and therefore from
 * ever scheduling its own wall-clock deadline check). Generous for a GET,
 * well under SCORE_TIMEOUT_MS.
 */
const POLL_TIMEOUT_MS = 20_000;

export class ScoringApiError extends Error {
  /**
   * `code`: the machine-readable failure code from the error body, when the
   * server sent one (POST /score's 500 carries judge_invalid_output |
   * judge_unavailable | internal — see server/scoringFailure.ts).
   */
  constructor(message: string, public status?: number, public code?: string, public nextAvailableAt?: string) {
    super(message);
    this.name = 'ScoringApiError';
  }
}

/**
 * True for a status that will never succeed by repeating the same request unchanged. A 429
 * is a usage limit (one sample exam per 7 days, or the daily scoring cap): retrying within
 * this attempt cannot change it.
 */
export function isTerminalScoringStatus(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403 || status === 409 || status === 429;
}

/** "Saturday 1 November", in the learner's own time zone. */
export function formatUnlockDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Launch limit (owner, 2026-10-24): one sample exam per rolling 7 days. */
export function weeklyExamLimitMessage(nextAvailableAt: string | null | undefined): string {
  const when = formatUnlockDate(nextAvailableAt);
  return `You can take one sample exam a week, and you've had this week's.${when ? ` Your next one unlocks on ${when}.` : ''}`;
}

export interface ExamAllowance {
  allowed: boolean;
  lastExamDate: string | null;
  nextAvailableAt: string | null;
}

/**
 * Whether this account may sit a sample exam now (server/index.ts GET /exam/allowance),
 * read without charging. null when it cannot be read (signed out, offline, not
 * configured) — the caller lets the learner start, and POST /score still enforces it.
 */
export async function getExamAllowance(): Promise<ExamAllowance | null> {
  if (!SCORING_API_BASE) return null;
  try {
    const res = await fetch(`${SCORING_API_BASE}/exam/allowance`, { headers: await authHeaders() });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<ExamAllowance>;
    if (typeof body.allowed !== 'boolean') return null;
    return { allowed: body.allowed, lastExamDate: body.lastExamDate ?? null, nextAvailableAt: body.nextAvailableAt ?? null };
  } catch {
    return null;
  }
}

/**
 * Batch 3: a terminal 409 means the server's `resolveAndVerifyQuestionSet`
 * (server/resolveQuestionSet.ts) couldn't hash-match this transcript against
 * EITHER the remote question set or the in-repo fixture — the content was
 * updated after this attempt ran, and per A5 the server will never score
 * against substituted content. That's a real, if unusual, outcome for a
 * candidate to hit — the raw server text ("declared questionSetHash does not
 * match…") means nothing to them, so replace it with plain language rather
 * than showing every other terminal status's server-provided message as-is.
 */
export function terminalScoringMessage(err: ScoringApiError): string {
  if (err.status === 409) {
    return "This exam's questions were updated after you took it, so this attempt can't be marked. Please retake the exam.";
  }
  if (err.status === 429) {
    return err.code === 'weekly_exam_limit'
      ? weeklyExamLimitMessage(err.nextAvailableAt)
      : "You've reached today's limit for exam marking. Please try again tomorrow.";
  }
  return err.message;
}

/**
 * True when the server definitively failed this attempt: a 5xx whose body
 * carries a `code`. The scoring server only sends a coded 5xx after it has
 * given up on the attempt and cleared its in-progress mark, so the caller
 * should re-POST (SUBMIT_SERVER_FAILED), not poll. A network error, a
 * timeout, or an uncoded 5xx (a proxy/gateway page, an older server) stays
 * ambiguous.
 */
export function isDefinitiveServerFailure(err: unknown): boolean {
  return (
    err instanceof ScoringApiError &&
    err.status !== undefined &&
    err.status >= 500 &&
    typeof err.code === 'string' &&
    err.code.length > 0
  );
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${SCORING_API_BASE}/score?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: await authHeaders(),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ScoringApiError('Polling the scoring service timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 404) return { status: 'not_found' };
  if (res.status === 202) return { status: 'in_progress' };
  const envelope = await parseEnvelopeResponse(res);
  return { status: 'done', envelope };
}

async function parseEnvelopeResponse(res: Response): Promise<EnvelopeView> {
  if (!res.ok) {
    let message = `Scoring request failed (${res.status})`;
    let code: string | undefined;
    let nextAvailableAt: string | undefined;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      if (typeof body?.code === 'string') code = body.code;
      // A usage-limit 429 names its limit in `error` (weekly_exam_limit, daily_quota_reached).
      if (res.status === 429 && typeof body?.error === 'string') code = body.error;
      if (typeof body?.nextAvailableAt === 'string') nextAvailableAt = body.nextAvailableAt;
    } catch {
      /* keep default message */
    }
    trackQuotaHit(res.status, 'exam_score', code && /^[a-z0-9_]{1,48}$/.test(code) ? code : null);
    throw new ScoringApiError(message, res.status, code, nextAvailableAt);
  }
  return res.json() as Promise<EnvelopeView>;
}

/** Phase 3 Batch A: client cap on POST /feedback (one model call, plus at most one retry server-side). */
const FEEDBACK_TIMEOUT_MS = 90_000;

/**
 * Phase 3 Batch A: the post-marking exam report for an already-scored
 * session (server/feedbackRoute.ts). Returns the stored report when one
 * exists (no charge); otherwise the server generates one (charged to the
 * `score` quota). Never affects the marks, which come only from the
 * envelope. Throws ScoringApiError on any non-200 (404: no envelope yet;
 * 429: daily limit reached; 500 `feedback_failed`: generation failed and was
 * not charged — safe to retry).
 */
export async function requestExamFeedback(sessionId: string): Promise<ExamFeedbackReport> {
  if (!SCORING_API_BASE) {
    throw new ScoringApiError('Scoring service is not configured (VITE_SCORING_API_URL unset)');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FEEDBACK_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${SCORING_API_BASE}/feedback`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ sessionId }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ScoringApiError('Feedback is taking longer than expected.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let message = `Feedback request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = await res.json();
      if (typeof body?.error === 'string') message = body.error;
      if (typeof body?.code === 'string') code = body.code;
    } catch {
      /* keep default message */
    }
    trackQuotaHit(res.status, 'exam_report', code && /^[a-z0-9_]{1,48}$/.test(code) ? code : null);
    throw new ScoringApiError(message, res.status, code);
  }
  const body = (await res.json()) as { report?: unknown };
  if (!isExamFeedbackReport(body.report)) {
    throw new ScoringApiError('Feedback response was not a report');
  }
  return body.report;
}

/**
 * A2/A3 — the Cambridge scoring service. Node web service (not a Vercel
 * function, not a background worker — see the plan's A0 for why). Imports
 * scoreAttempt unchanged from scripts/scoring/scoreAttempt.ts; this file is
 * its second caller (batchScore.ts's CLI is the first). No Python rubric or
 * prompt exists — FastAPI's diff outside this file/its migrations is zero.
 *
 * Handler order (each step gates the next — see plan A2):
 *   1. auth: supabase.auth.getUser(token) -> user_id, else 401
 *   2. parseSessionTranscript(body) -> 400 on invalid
 *   3. contentProvenance !== 'original-practice' -> 403 before any work
 *   4. idempotency fast path: existing envelope for this sessionId? return it, no LLM call
 *      (best-effort — narrows the race window but two near-simultaneous requests
 *      can both pass this check and both score; step 7's DB constraint is the backstop)
 *   5. hash guard (A5): resolved question set's hash must match the transcript's
 *      declared questionSetHash, else 409, nothing written
 *   6. transcriptStore.save(transcript, userId) -> scoreAttempt() loads it back
 *      (any failure from here on: last_attempt_at reset via markAttemptFailed,
 *      then 500 {error, code} — code from scoringFailure.ts)
 *   7. envelopeStore.saveOriginal() — Phase B: scoring_envelopes_one_original_per_session
 *      (20260717130000) is a partial unique index on session_id where regraded_from
 *      is null. On a losing 23505 (another concurrent request won), saveOriginal loads
 *      and returns that winner instead of throwing, so both concurrent requests get an
 *      identical 200 for one LLM call and one row, not a second envelope or an error.
 *   8. buildEnvelopeView(envelope) -> 200
 *
 * Never abort scoring on client disconnect (A2) — confirmed both locally and
 * on Render's real proxy (A11) that a disconnect does not cancel in-flight
 * work; that is what makes A9's retry-is-idempotent story hold.
 */

import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

import { parseSessionTranscript, SessionTranscriptValidationError } from '../src/domain/igcse/stt/schema';
import type { SessionTranscript } from '../src/domain/igcse/stt/types';
import { createSupabaseTranscriptStore, getLastAttemptAt, markAttemptFailed } from '../scripts/stt/supabaseTranscriptStore';
import { createSupabaseEnvelopeStore } from '../scripts/scoring/supabaseEnvelopeStore';
import { scoreAttempt } from '../scripts/scoring/scoreAttempt';
import { createJudgeWithFallback } from '../scripts/scoring/providers/judgeFactory';
import { buildEnvelopeView } from '../src/domain/igcse/envelope/envelopeView';
import { isScoringDebugEnabled } from '../scripts/scoring/observability/logger';
import { resolveAndVerifyQuestionSet, QuestionSetNotFoundError, QuestionSetHashMismatchError } from './resolveQuestionSet';
import { createTtlCache, probeGroq, probeGemini, type ProviderProbeStatus } from './healthProbe';
import { consumeAiQuotaOr503, QuotaDeniedError } from './aiQuota';
import { classifyScoringFailure } from './scoringFailure';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/** Same defaults as geminiJudge.ts/groqJudge.ts — kept in sync manually, no shared import to avoid coupling /health to judge internals. */
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';

const healthProbeCache = createTtlCache<ProviderProbeStatus>();
const groqHealthClient = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : undefined;
const geminiHealthClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : undefined;

async function getProviderProbeStatus(): Promise<ProviderProbeStatus> {
  const cached = healthProbeCache.get();
  if (cached) return cached;

  const groq = groqHealthClient ? await probeGroq(groqHealthClient, GROQ_MODEL) : 'not_configured';
  const gemini = geminiHealthClient ? await probeGemini(geminiHealthClient, GEMINI_MODEL) : 'not_configured';
  const status: ProviderProbeStatus = { groq, gemini };

  const bothHealthy = groq !== 'degraded' && gemini !== 'degraded';
  healthProbeCache.set(status, bothHealthy ? 60_000 : 5_000);
  return status;
}

/**
 * Reliability plan §A — how long a session_transcripts row's last_attempt_at
 * is trusted as "an attempt is plausibly still running" before GET /score
 * treats it as abandoned (crashed/redeployed process) and safe to resubmit.
 * No hard timeout exists on the Gemini/Groq calls (judgeFactory.ts), so this
 * is a conservative judgment call, not a derived value — comfortably above
 * typical scoring latency (seconds to ~1-2 min).
 */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** A10 — one request-scoped line per /score call, on top of scoreAttempt's own per-stage logStage lines. */
function logRequest(sessionId: string, provider: string | undefined, durationMs: number, outcome: 'ok' | 'error'): void {
  if (!isScoringDebugEnabled()) return;
  console.log(JSON.stringify({ sessionId, provider, durationMs, outcome }));
}

async function authenticate(req: Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

const app = express();
app.use(cors({ origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : true }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', async (_req: Request, res: Response) => {
  const providers = await getProviderProbeStatus();
  res.status(200).json({ ok: true, providers });
});

app.post('/score', async (req: Request, res: Response) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  let transcript: SessionTranscript;
  try {
    transcript = parseSessionTranscript(req.body);
  } catch (err) {
    const message = err instanceof SessionTranscriptValidationError ? err.message : 'invalid transcript';
    res.status(400).json({ error: message });
    return;
  }

  if (transcript.contentProvenance !== 'original-practice') {
    res.status(403).json({ error: 'contentProvenance must be original-practice' });
    return;
  }

  const envelopeStore = createSupabaseEnvelopeStore({ url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY, userId });

  const existing = await envelopeStore.listBySession(transcript.sessionId);
  const existingOriginal = existing.find((e) => e.regradedFrom === undefined);
  if (existingOriginal) {
    res.status(200).json(buildEnvelopeView(existingOriginal));
    return;
  }

  // §A optional hardening: close the in-flight-duplicate race from the server
  // side too — if a non-stale attempt is already underway for this session
  // (last_attempt_at within the staleness window, no envelope yet), don't
  // kick off a second scoreAttempt()/LLM call for it. The DB unique index
  // (scoring_envelopes_one_original_per_session) remains the hard backstop
  // either way; this just avoids paying for a duplicate LLM call.
  const priorAttemptAt = await getLastAttemptAt(
    { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY, userId },
    transcript.sessionId,
  );
  if (priorAttemptAt && Date.now() - priorAttemptAt.getTime() < STALE_THRESHOLD_MS) {
    res.status(202).json({ status: 'in_progress' });
    return;
  }

  let questionSet;
  try {
    questionSet = await resolveAndVerifyQuestionSet(transcript.questionSetId, transcript.questionSetHash);
  } catch (err) {
    if (err instanceof QuestionSetHashMismatchError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof QuestionSetNotFoundError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Quota consumed only once the request is actually about to reach a
  // scoreAttempt()/LLM call — the existingOriginal fast path above (an
  // already-scored session) and GET /score's polling never charge quota,
  // matching the "consume on cache-miss, not before" principle used
  // throughout this plan (phase-3-plan-tidy-widget.md §2 correction #6).
  // sessionId is a crypto.randomUUID() minted once per attempt and resent
  // verbatim on retry (ExamMode.tsx), so it doubles as the idempotency key.
  try {
    await consumeAiQuotaOr503(userId, 'score', transcript.sessionId);
  } catch (err) {
    if (err instanceof QuotaDeniedError) {
      res.status(err.statusCode).json({ error: err.reason, ...err.data });
      return;
    }
    // QuotaServiceUnavailableError, or anything else — must not propagate
    // unhandled (root cause #1 above: an Express 4 async handler whose
    // promise rejects here never sends a response at all).
    console.error(`[POST /score] quota check failed for session "${transcript.sessionId}":`, err);
    res.status(503).json({ error: 'quota_service_unavailable' });
    return;
  }

  const transcriptStoreOptions = { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY, userId };
  const transcriptStore = createSupabaseTranscriptStore(transcriptStoreOptions);

  const startedAt = Date.now();
  try {
    // Inside the try (it wasn't before): a save failure — Supabase error,
    // TranscriptOwnershipError — must reach the same logged, coded 500 as a
    // scoring failure, not an unhandled rejection.
    await transcriptStore.save(transcript);
    const envelope = await scoreAttempt(
      { transcriptStore, createJudge: () => createJudgeWithFallback() },
      { sessionId: transcript.sessionId, questionSet },
    );
    const savedEnvelope = await envelopeStore.saveOriginal(envelope);
    logRequest(transcript.sessionId, envelope.llm.provider, Date.now() - startedAt, 'ok');
    res.status(200).json(buildEnvelopeView(savedEnvelope));
  } catch (err) {
    // Root cause #1 (reliability plan §A): without this, an Express 4 async
    // handler whose promise rejects here never sends a response — a client
    // still within its abort window hangs until its own timeout, and the
    // resulting message ("may still finish in the background") is false.
    logRequest(transcript.sessionId, undefined, Date.now() - startedAt, 'error');
    // Don't echo the raw exception string to the client — it can carry
    // provider error text, stack fragments, or internal identifiers. Log the
    // detail server-side; return a generic message. (Phase 1.1 minimal
    // version of Phase 6.3.)
    console.error(
      `[POST /score] scoring failed for session "${transcript.sessionId}":`,
      err instanceof Error ? err.stack ?? err.message : err,
    );
    // This attempt is over, not "in progress": un-stamp last_attempt_at so
    // GET /score answers 404 now rather than 202 for STALE_THRESHOLD_MS, and
    // the client's retry POST isn't turned away as an in-flight duplicate.
    await markAttemptFailed(transcriptStoreOptions, transcript.sessionId);
    // `code` marks this 500 as a definitive failure the client may retry
    // with a fresh POST (see scoringFailure.ts).
    res.status(500).json({ error: 'scoring failed', code: classifyScoringFailure(err) });
  }
});

app.get('/score', async (req: Request, res: Response) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const sessionId = req.query.sessionId;
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    res.status(400).json({ error: 'sessionId query param is required' });
    return;
  }

  const envelopeStore = createSupabaseEnvelopeStore({ url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY, userId });
  const existing = await envelopeStore.listBySession(sessionId);
  const original = existing.find((e) => e.regradedFrom === undefined);
  if (original) {
    res.status(200).json(buildEnvelopeView(original));
    return;
  }

  // Reliability plan §A: existence-only (200/404) can't distinguish "still
  // scoring" from "the process that was scoring it is gone" — both leave an
  // identical session_transcripts row with no envelope yet. last_attempt_at
  // is the recency signal that tells them apart: within the staleness
  // window, a 202 tells the client to keep polling instead of re-POSTing
  // (which would trigger a duplicate, wasted LLM call for a still-live
  // request); past it, the earlier attempt is presumed dead and a 404 tells
  // the client it's safe — and necessary — to resubmit.
  const lastAttemptAt = await getLastAttemptAt(
    { url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY, userId },
    sessionId,
  );
  if (lastAttemptAt && Date.now() - lastAttemptAt.getTime() < STALE_THRESHOLD_MS) {
    res.status(202).json({ status: 'in_progress' });
    return;
  }

  res.status(404).json({ error: 'no envelope for this sessionId' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scoring service listening on 0.0.0.0:${PORT}`);
});

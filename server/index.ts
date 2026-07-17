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
 *      (best-effort only here — race-safe enforcement is Part B's DB unique index,
 *      explicitly out of scope for this session; two near-simultaneous requests
 *      for the same sessionId can both score until B lands)
 *   5. hash guard (A5): resolved question set's hash must match the transcript's
 *      declared questionSetHash, else 409, nothing written
 *   6. transcriptStore.save(transcript, userId) -> scoreAttempt() loads it back
 *   7. envelopeStore.save()
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

import { parseSessionTranscript, SessionTranscriptValidationError } from '../src/domain/igcse/stt/schema';
import type { SessionTranscript } from '../src/domain/igcse/stt/types';
import { createSupabaseTranscriptStore } from '../scripts/stt/supabaseTranscriptStore';
import { createSupabaseEnvelopeStore } from '../scripts/scoring/supabaseEnvelopeStore';
import { scoreAttempt } from '../scripts/scoring/scoreAttempt';
import { createJudgeWithFallback } from '../scripts/scoring/providers/judgeFactory';
import { buildEnvelopeView } from '../scripts/scoring/reporting/envelopeView';
import { isScoringDebugEnabled } from '../scripts/scoring/observability/logger';
import { resolveAndVerifyQuestionSet, QuestionSetNotFoundError, QuestionSetHashMismatchError } from './resolveQuestionSet';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

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

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
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

  const transcriptStore = createSupabaseTranscriptStore({ url: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_KEY, userId });
  await transcriptStore.save(transcript);

  const startedAt = Date.now();
  let envelope;
  try {
    envelope = await scoreAttempt(
      { transcriptStore, createJudge: () => createJudgeWithFallback() },
      { sessionId: transcript.sessionId, questionSet },
    );
  } catch (err) {
    logRequest(transcript.sessionId, undefined, Date.now() - startedAt, 'error');
    throw err;
  }
  await envelopeStore.save(envelope);
  logRequest(transcript.sessionId, envelope.llm.provider, Date.now() - startedAt, 'ok');

  res.status(200).json(buildEnvelopeView(envelope));
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
  if (!original) {
    res.status(404).json({ error: 'no envelope for this sessionId' });
    return;
  }
  res.status(200).json(buildEnvelopeView(original));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scoring service listening on 0.0.0.0:${PORT}`);
});

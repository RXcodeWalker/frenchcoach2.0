/**
 * Teacher dashboard (docs/plans/teacher-dashboard.md Stage 0 + Stage 3; ADR 0014).
 *
 * Two things POST /score needs that are about the attempt, never about its mark:
 *
 *  1. How it was sat — Exam Sim or Coached, and whether it counts toward progress
 *     (ADR 0007). The client sends `?mode=examSim|coached&counts=1|0`; the server
 *     records it in `exam_attempt_meta` beside the envelope (never inside it), and
 *     forces `counts=false` itself for Coached, an edited transcript or any typed
 *     answer — so the teacher view never shows a practice mark as a real one.
 *     Nothing here reaches scoreAttempt(): the transcript and the envelope are
 *     untouched (scoredPipelineBoundary).
 *
 *  2. Homework allowance — `?assignment=<uuid>` names a mock exam a teacher set. If
 *     the `assignment_allowance` RPC (backend migration 20261103091000) accepts it,
 *     the attempt charges `assignment_exam` with key `asg:<id>:<sessionId>` instead
 *     of `exam_attempt`, and skips the weekly-exam check — homework never uses up,
 *     and is never blocked by, the learner's own weekly exam. Anything else (no
 *     param, bad id, RPC error, a "no") falls back to the normal rules.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionTranscript } from '../src/domain/igcse/stt/types';

export const ASSIGNMENT_EXAM_FEATURE = 'assignment_exam';

export type ConductMode = 'examSim' | 'coached';

export interface AttemptMetaParams {
  conductMode: ConductMode;
  /** What the client claimed; the server may only lower it. */
  countsClaimed: boolean;
  assignmentId: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAssignmentId(raw: unknown): string | null {
  return typeof raw === 'string' && UUID_RE.test(raw.trim()) ? raw.trim().toLowerCase() : null;
}

/** Reads the query params. A missing/unknown mode is treated as Coached (the safe side: not counted). */
export function parseAttemptMetaParams(query: Record<string, unknown>): AttemptMetaParams {
  const conductMode: ConductMode = query.mode === 'examSim' ? 'examSim' : 'coached';
  return {
    conductMode,
    countsClaimed: query.counts === '1' || query.counts === 'true',
    assignmentId: parseAssignmentId(query.assignment),
  };
}

/** The server's own verdict: the claim, lowered for anything the transcript itself shows. */
export function serverCountsTowardProgress(params: AttemptMetaParams, transcript: SessionTranscript): boolean {
  if (!params.countsClaimed || params.conductMode !== 'examSim') return false;
  if (transcript.userCorrected) return false;
  return !transcript.utterances.some((u) => u.role === 'candidate' && u.inputMode === 'text');
}

export function assignmentExamKey(assignmentId: string, sessionId: string): string {
  return `asg:${assignmentId}:${sessionId}`;
}

/**
 * True when this attempt may use the homework allowance. Never throws: any failure
 * means "use the learner's own limits", which POST /score then enforces as before.
 */
export async function homeworkExamAllowed(
  client: Pick<SupabaseClient, 'rpc'>,
  userId: string,
  assignmentId: string | null,
  sessionId: string,
): Promise<boolean> {
  if (!assignmentId) return false;
  try {
    const { data, error } = await client.rpc('assignment_allowance', {
      p_user_id: userId,
      p_assignment_id: assignmentId,
      p_exclude_key: sessionId ? assignmentExamKey(assignmentId, sessionId) : null,
    });
    if (error) throw error;
    const body = (data ?? {}) as { ok?: unknown; feature?: unknown };
    return body.ok === true && body.feature === ASSIGNMENT_EXAM_FEATURE;
  } catch (err) {
    console.error('[assignment_allowance] lookup failed (normal limits apply):', err);
    return false;
  }
}

/** Best-effort: a failure is logged and never turns a scored attempt into an error. */
export async function saveAttemptMeta(
  client: Pick<SupabaseClient, 'from'>,
  row: { userId: string; sessionId: string; conductMode: ConductMode; countsTowardProgress: boolean; assignmentId: string | null },
): Promise<void> {
  try {
    const { error } = await client.from('exam_attempt_meta').upsert(
      {
        user_id: row.userId,
        session_id: row.sessionId,
        conduct_mode: row.conductMode,
        counts_toward_progress: row.countsTowardProgress,
        assignment_id: row.assignmentId,
      },
      { onConflict: 'user_id,session_id' },
    );
    if (error) throw error;
  } catch (err) {
    console.error(`[exam_attempt_meta] save failed for session "${row.sessionId}":`, err);
  }
}

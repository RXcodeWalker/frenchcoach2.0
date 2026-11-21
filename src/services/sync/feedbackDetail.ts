/**
 * The full feedback a learner was shown for one answer, as synced to
 * `sessions.feedback_detail` (backend migration 20261121090000). Debugging
 * only: it exists so the owner can answer "the app said my sentence was wrong
 * but it's fine" with the exact corrections, quotes and improved answer the
 * learner saw. Nothing in the app reads it back (restore does not select it).
 *
 * Why a separate column, not a wider `sessions.feedback`: `teacher_student_sessions`
 * returns the whole `feedback` blob to a class's teachers and `get_parent_report`
 * reads keys out of it. `feedback_detail` is selected by no RPC, view or job
 * (pinned by the backend's test_sessions_feedback_detail.py), so this widens no
 * teacher or parent view.
 *
 * Input is `Session.feedback` — the FeedbackV2 after normalizeBackendFeedback's
 * filters (grounding, sound-alikes, self-corrections), i.e. what was rendered.
 *
 * Never included:
 *  - `levelCheck` — the marking ladder; the learner's chosen level never leaves
 *    the device (learn-marking §8). `fb.scores` is always Exam standard.
 *  - `changes` — render-time only (invariant #4 on FeedbackV2.changes).
 *  - `providerAttempts` — raw upstream error strings.
 *  - `pronunciation` — not shown on a free answer while the Pronunciation Lab is live.
 */
import type { FeedbackV2, Session } from '../../types';

/** Bump when the shape changes; a reader branches on `v`. */
export const FEEDBACK_DETAIL_VERSION = 1;
/** UTF-8 bytes of JSON. Real replies are ~5 KB median, ~10 KB max; the database refuses > 32 KB. */
export const FEEDBACK_DETAIL_MAX_BYTES = 16_000;

const MAX_STRING = 2000;
const MAX_ARRAY = 30;
const MAX_DEPTH = 6;

/** Top-level FeedbackV2 keys copied as shown, in order of importance for debugging. */
const SHOWN_KEYS = [
  // the verdict and what was marked
  'scores', 'unscored', 'cefrLevel', 'wordCount', 'gradedTranscript',
  // what the learner was told
  'encouragement', 'grammar', 'issues', 'selfCorrections', 'improved_answer', 'rephrase',
  'strengths', 'best_moment', 'biggest_opportunity', 'topPriorityIssueId',
  'strongestMomentSpan', 'strongestMomentExplanation', 'examiner', 'followUpQuestion',
  'transcriptAnnotations', 'vocabulary', 'vocabularyV2', 'style', 'fillers', 'expansion_ideas',
  'answered_the_question', 'demands_met', 'demands_missed', 'difficulty_fit', 'avoidanceReport',
  'deepAnalysis',
  // which engine/prompt produced it
  'schemaVersion', 'promptVersion', 'markingVersion', 'provider', 'effectiveDepth', 'responseTier',
  'transcriptHash', 'demandsResolved', 'confidence',
] as const satisfies readonly (keyof FeedbackV2)[];

/**
 * Dropped, in this order, while the blob is over FEEDBACK_DETAIL_MAX_BYTES —
 * the least useful for a "was this correction right?" question first.
 */
const DROP_ORDER = [
  'deepAnalysis', 'avoidanceReport', 'transcriptAnnotations', 'vocabularyV2', 'vocabulary',
  'expansion_ideas', 'style', 'fillers', 'strongestMomentSpan', 'strongestMomentExplanation',
  'examiner', 'strengths', 'gradedTranscript',
] as const;

export interface FeedbackDetail {
  v: number;
  questionId?: string;
  engine?: { requested?: string; actual?: string; fallbackUsed?: boolean; failoverReason?: string; latencyMs?: number };
  /** Field names removed by the size cap, so a reader knows the blob is partial. */
  dropped?: string[];
  [key: string]: unknown;
}

/** A JSON-safe copy with strings, arrays and depth capped. Functions, undefined and non-finite numbers are dropped. */
function capValue(value: unknown, depth: number): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case 'string': return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    case 'number': return Number.isFinite(value) ? value : undefined;
    case 'boolean': return value;
    case 'object': {
      if (depth >= MAX_DEPTH) return undefined;
      if (Array.isArray(value)) {
        return value.slice(0, MAX_ARRAY).map(v => capValue(v, depth + 1)).filter(v => v !== undefined);
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const capped = capValue(v, depth + 1);
        if (capped !== undefined) out[k] = capped;
      }
      return out;
    }
    default: return undefined;
  }
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/**
 * The detail blob for a session's feedback, or null when there is none (an
 * exam, a game, an unscored answer with no feedback object). Exported for tests.
 */
export function buildFeedbackDetail(session: Pick<Session, 'feedback' | 'questionId'>): FeedbackDetail | null {
  const fb = session.feedback as FeedbackV2 | undefined;
  if (!fb || typeof fb !== 'object') return null;

  const detail: FeedbackDetail = { v: FEEDBACK_DETAIL_VERSION };
  if (typeof session.questionId === 'string' && session.questionId) detail.questionId = session.questionId.slice(0, 120);
  const meta = fb.engineMeta;
  if (meta && typeof meta === 'object') {
    detail.engine = capValue({
      requested: meta.requestedEngine,
      actual: meta.actualEngine,
      fallbackUsed: meta.fallbackUsed,
      failoverReason: meta.failoverReason,
      latencyMs: meta.latencyMs,
    }, 1) as FeedbackDetail['engine'];
  }

  const source = fb as unknown as Record<string, unknown>;
  for (const key of SHOWN_KEYS) {
    const capped = capValue(source[key], 1);
    if (capped !== undefined) detail[key] = capped;
  }

  const dropped: string[] = [];
  for (const key of DROP_ORDER) {
    if (jsonBytes(detail) <= FEEDBACK_DETAIL_MAX_BYTES) break;
    if (key in detail) {
      delete detail[key];
      dropped.push(key);
    }
  }
  if (dropped.length > 0) detail.dropped = dropped;
  // Still too big (pathological lengths everywhere): keep the corrections only.
  if (jsonBytes(detail) > FEEDBACK_DETAIL_MAX_BYTES) {
    const minimal: FeedbackDetail = { v: FEEDBACK_DETAIL_VERSION, dropped: ['*'] };
    for (const key of ['questionId', 'scores', 'grammar', 'issues', 'improved_answer'] as const) {
      if (detail[key] !== undefined) (minimal as Record<string, unknown>)[key] = detail[key];
    }
    while (jsonBytes(minimal) > FEEDBACK_DETAIL_MAX_BYTES && minimal.improved_answer !== undefined) delete minimal.improved_answer;
    if (jsonBytes(minimal) > FEEDBACK_DETAIL_MAX_BYTES) delete minimal.issues;
    if (jsonBytes(minimal) > FEEDBACK_DETAIL_MAX_BYTES) delete minimal.grammar;
    return minimal;
  }
  return detail;
}

/**
 * Validation of the post-marking exam report (Phase 3 Batch A, ADR 0009).
 *
 * Same posture as the Learn/rail examiner feedback: a rule failure DROPS the
 * offending item, it never rewrites it. Rules, all from the Phase 3 plan's
 * "Shared invariants":
 *  - every claim is grounded per turn: its quote must appear verbatim in the
 *    candidate's answer for the `ref` it names (per task for role play);
 *  - quote minimums (UNVALIDATED app policy, shared/quoteRules.ts) — except a
 *    role-play quote may be the task's whole answer when that answer is shorter;
 *  - claim text passes the mark/band filter and the descriptor-copy filter;
 *  - a strength whose quote overlaps a reported error is dropped;
 *  - a role-play task error only on a task credited below the top mark
 *    (Table A, TN p.10: errors impede communication);
 *  - QoL errors are COPIED from the envelope (quote, correction, source,
 *    turnId); the model only classifies them. The display filters then drop
 *    an identical correction, and on a spoken turn a sound-alike one;
 *  - a next step must name one of the target descriptors for its criterion.
 *
 * The envelope is only ever read.
 */

import type { ScoringEnvelope } from '../igcse/envelope/types';
import type { QolError } from '../igcse/judgement/types';
import { topicTurnKey } from '../igcse/judgement/schema';
import { COMMUNICATION, QUALITY_OF_LANGUAGE, ROLE_PLAY } from '../igcse/rubric';
import { coerceErrorCategory } from './shared/errorCategories';
import { claimCopiesDescriptor } from './shared/descriptorCopyFilter';
import { claimMentionsMarkOrBand } from './shared/markClaimFilter';
import {
  isGroundedQuote,
  meetsClaimQuoteMinimum,
  meetsErrorQuoteMinimum,
  quotesOverlap,
  sameQuote,
} from './shared/quoteRules';
import { shouldDropSpellingOnlyError } from './shared/spellingOnly';
import { EXAM_FEEDBACK_MAX_STRENGTHS, buildTurnCorpora, targetDescriptorsFor, type TargetCriterion } from './prompt';
import type {
  ExamFeedbackClaim,
  ExamFeedbackError,
  ExamFeedbackNextStep,
  ExamFeedbackQolError,
  ExamFeedbackReport,
  ExamFeedbackRolePlayTask,
} from './types';
import { EXAM_FEEDBACK_VERSION } from './version';

const ALL_CANONICAL_BULLETS: readonly string[] = [
  ...ROLE_PLAY.marks.flatMap((m) => m.descriptor),
  ...COMMUNICATION.bands.flatMap((b) => b.descriptor),
  ...QUALITY_OF_LANGUAGE.bands.flatMap((b) => b.descriptor),
];

const TOP_ROLE_PLAY_MARK = ROLE_PLAY.marksPerResponse;

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function claimIsAcceptable(claim: string): boolean {
  return claim !== '' && !claimMentionsMarkOrBand(claim) && !claimCopiesDescriptor(claim, ALL_CANONICAL_BULLETS);
}

/** How many quoted items the model proposed, and how many were grounded — an all-ungrounded reply is retried. */
class Tally {
  proposed = 0;
  grounded = 0;
}

interface Context {
  envelope: ScoringEnvelope;
  corpora: Map<string, string>;
  inputModeByRef: Map<string, 'speech' | 'text' | undefined>;
  tally: Tally;
}

/** A role-play quote may be the whole (short) answer; otherwise the 3-word minimum applies. */
function meetsQuoteMinimumFor(ref: string, quote: string, ctx: Context): boolean {
  if (meetsClaimQuoteMinimum(quote)) return true;
  const isRolePlay = ctx.envelope.transcriptSnapshot.rolePlay.some((t) => t.taskId === ref);
  return isRolePlay && sameQuote(quote, ctx.corpora.get(ref) ?? '');
}

function parseClaim(
  item: unknown,
  allowedRefs: ReadonlySet<string>,
  errorsByRef: ReadonlyMap<string, readonly { quote: string }[]>,
  ctx: Context,
): ExamFeedbackClaim | null {
  if (!isRec(item)) return null;
  const claim = str(item.claim);
  const quote = str(item.quote);
  const ref = str(item.ref);
  if (claim === '' || quote === '' || !allowedRefs.has(ref)) return null;
  ctx.tally.proposed++;
  const corpus = ctx.corpora.get(ref) ?? '';
  if (!isGroundedQuote(quote, corpus)) return null;
  ctx.tally.grounded++;
  if (!meetsQuoteMinimumFor(ref, quote, ctx)) return null;
  if (!claimIsAcceptable(claim)) return null;
  if ((errorsByRef.get(ref) ?? []).some((e) => quotesOverlap(e.quote, quote, corpus))) return null;
  return { claim, quote, ref };
}

function parseStrengths(
  raw: unknown,
  allowedRefs: ReadonlySet<string>,
  errorsByRef: ReadonlyMap<string, readonly { quote: string }[]>,
  ctx: Context,
): ExamFeedbackClaim[] {
  const out: ExamFeedbackClaim[] = [];
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    const s = parseClaim(item, allowedRefs, errorsByRef, ctx);
    if (!s || out.some((o) => sameQuote(o.quote, s.quote))) continue;
    out.push(s);
    if (out.length >= EXAM_FEEDBACK_MAX_STRENGTHS) break;
  }
  return out;
}

function parseNextStep(
  raw: unknown,
  criterion: TargetCriterion,
  allowedRefs: ReadonlySet<string>,
  ctx: Context,
): ExamFeedbackNextStep | null {
  if (!isRec(raw)) return null;
  const claim = str(raw.claim);
  const target = targetDescriptorsFor(ctx.envelope)[criterion].find((t) => t.id === str(raw.targetDescriptorId));
  if (claim === '' || !target) return null;
  ctx.tally.proposed++;
  const quote = str(raw.quote);
  const ref = str(raw.ref);
  if (quote !== '') {
    if (!allowedRefs.has(ref) || !isGroundedQuote(quote, ctx.corpora.get(ref) ?? '')) return null;
    ctx.tally.grounded++;
    if (!meetsQuoteMinimumFor(ref, quote, ctx)) return null;
  } else {
    ctx.tally.grounded++; // nothing to ground
  }
  if (!claimIsAcceptable(claim)) return null;
  return {
    claim,
    quote: quote === '' ? null : quote,
    ref: quote === '' ? null : ref,
    targetDescriptor: target.text,
    targetSource: target.source,
  };
}

function parseTaskError(raw: unknown, taskId: string, ctx: Context): ExamFeedbackError | null {
  if (!isRec(raw)) return null;
  const quote = str(raw.quote);
  const correction = str(raw.correction);
  if (quote === '' || correction === '') return null;
  ctx.tally.proposed++;
  if (!isGroundedQuote(quote, ctx.corpora.get(taskId) ?? '')) return null;
  ctx.tally.grounded++;
  if (!meetsErrorQuoteMinimum(quote)) return null;
  // Role-play responses carry no per-task input mode; an unknown mode keeps the error (shared/spellingOnly.ts).
  if (shouldDropSpellingOnlyError(quote, correction, undefined)) return null;
  return { quote, correction, category: coerceErrorCategory(raw.category) };
}

function parseRolePlayTasks(raw: unknown, ctx: Context): ExamFeedbackRolePlayTask[] {
  const proposed = Array.isArray(raw) ? raw.filter(isRec) : [];
  return ctx.envelope.rolePlayTasks.map((task) => {
    const item = proposed.find((p) => str(p.taskId) === task.taskId);
    const empty: ExamFeedbackRolePlayTask = { taskId: task.taskId, reason: null, quote: null, error: null };
    if (!item) return empty;

    const corpus = ctx.corpora.get(task.taskId) ?? '';
    const error = task.mark < TOP_ROLE_PLAY_MARK ? parseTaskError(item.error, task.taskId, ctx) : null;

    const reason = str(item.reason);
    const quote = str(item.quote);
    let keptQuote: string | null = null;
    let reasonOk = claimIsAcceptable(reason);
    if (reason !== '') ctx.tally.proposed++;
    if (corpus.trim() === '') {
      // A silent task: nothing to quote, the reason stands on the task alone.
      if (reason !== '') ctx.tally.grounded++;
    } else if (quote !== '' && isGroundedQuote(quote, corpus)) {
      if (reason !== '') ctx.tally.grounded++;
      if (meetsQuoteMinimumFor(task.taskId, quote, ctx)) keptQuote = quote;
      else reasonOk = false;
    } else {
      // The reason must be grounded in THIS task's answer.
      reasonOk = false;
    }
    if (!reasonOk) return { ...empty, error };
    return { taskId: task.taskId, reason, quote: keptQuote, error };
  });
}

export interface QolErrorDisplayDecision {
  errorIndex: number;
  error: QolError;
  kept: boolean;
  /** Why a dropped error was dropped. */
  dropReason?: 'identical-correction' | 'sound-alike-on-speech';
}

/**
 * The display filters applied to the envelope's QoL errors (they stay in the
 * envelope either way). Exported so judge:check --feedback can report every
 * error these filters drop.
 */
export function decideQolErrorDisplay(envelope: ScoringEnvelope): QolErrorDisplayDecision[] {
  const inputModes = inputModeByRef(envelope);
  return (envelope.qualityOfLanguage.errors ?? []).map((error, errorIndex) => {
    const mode = inputModes.get(topicTurnKey(error.source, error.turnId));
    if (!shouldDropSpellingOnlyError(error.quote, error.correction, mode)) return { errorIndex, error, kept: true };
    const identical = shouldDropSpellingOnlyError(error.quote, error.correction, 'text');
    return { errorIndex, error, kept: false, dropReason: identical ? 'identical-correction' : 'sound-alike-on-speech' };
  });
}

function inputModeByRef(envelope: ScoringEnvelope): Map<string, 'speech' | 'text' | undefined> {
  const out = new Map<string, 'speech' | 'text' | undefined>();
  for (const conversation of envelope.transcriptSnapshot.topicConversations) {
    for (const turn of conversation.turns) {
      out.set(topicTurnKey(conversation.conversationId, turn.turnId), turn.inputMode);
    }
  }
  return out;
}

function parseQolErrors(raw: unknown, ctx: Context): ExamFeedbackQolError[] {
  const categories = new Map<number, unknown>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isRec(item) && typeof item.errorIndex === 'number' && !categories.has(item.errorIndex)) {
        categories.set(item.errorIndex, item.category);
      }
    }
  }
  return decideQolErrorDisplay(ctx.envelope)
    .filter((d) => d.kept)
    .map((d) => ({
      errorIndex: d.errorIndex,
      source: d.error.source,
      turnId: d.error.turnId,
      quote: d.error.quote,
      correction: d.error.correction,
      // An unclassified error is still a real error: 'other', never dropped.
      category: coerceErrorCategory(categories.get(d.errorIndex)),
    }));
}

function stripJsonFence(raw: string): string {
  const m = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(raw);
  return m ? m[1] : raw;
}

/**
 * Parses and validates the model's reply against `envelope`. Returns `null`
 * when the reply is unusable and worth the one retry: not JSON, missing a
 * criterion section, or nothing it quoted was grounded. Everything else is
 * filtered item by item.
 */
export function parseExamFeedback(rawText: string, envelope: ScoringEnvelope): ExamFeedbackReport | null {
  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonFence(rawText));
  } catch {
    return null;
  }
  if (!isRec(raw) || !isRec(raw.rolePlay) || !isRec(raw.communication) || !isRec(raw.qualityOfLanguage)) return null;

  const ctx: Context = {
    envelope,
    corpora: buildTurnCorpora(envelope),
    inputModeByRef: inputModeByRef(envelope),
    tally: new Tally(),
  };
  const rolePlayRefs = new Set(envelope.transcriptSnapshot.rolePlay.map((t) => t.taskId));
  const topicRefs = new Set(ctx.inputModeByRef.keys());

  const tasks = parseRolePlayTasks(raw.rolePlay.tasks, ctx);
  const taskErrors = new Map(tasks.filter((t) => t.error).map((t) => [t.taskId, [t.error!]]));

  const qolErrors = parseQolErrors(raw.qualityOfLanguage.errorCategories, ctx);
  const qolErrorsByRef = new Map<string, ExamFeedbackQolError[]>();
  for (const e of qolErrors) {
    const ref = topicTurnKey(e.source, e.turnId);
    qolErrorsByRef.set(ref, [...(qolErrorsByRef.get(ref) ?? []), e]);
  }

  const report: ExamFeedbackReport = {
    feedbackVersion: EXAM_FEEDBACK_VERSION,
    rolePlay: {
      tasks,
      strengths: parseStrengths(raw.rolePlay.strengths, rolePlayRefs, taskErrors, ctx),
      nextStep: parseNextStep(raw.rolePlay.nextStep, 'rolePlay', rolePlayRefs, ctx),
    },
    communication: {
      strengths: parseStrengths(raw.communication.strengths, topicRefs, qolErrorsByRef, ctx),
      nextStep: parseNextStep(raw.communication.nextStep, 'communication', topicRefs, ctx),
    },
    qualityOfLanguage: {
      strengths: parseStrengths(raw.qualityOfLanguage.strengths, topicRefs, qolErrorsByRef, ctx),
      errors: qolErrors,
      nextStep: parseNextStep(raw.qualityOfLanguage.nextStep, 'qualityOfLanguage', topicRefs, ctx),
    },
  };

  if (ctx.tally.proposed === 0 || ctx.tally.grounded === 0) return null;
  return report;
}

/** Shape check for a report read back from storage (the row is service-written; this guards a version skew). */
export function isExamFeedbackReport(value: unknown): value is ExamFeedbackReport {
  return (
    isRec(value) &&
    typeof value.feedbackVersion === 'string' &&
    isRec(value.rolePlay) &&
    Array.isArray(value.rolePlay.tasks) &&
    isRec(value.communication) &&
    isRec(value.qualityOfLanguage) &&
    Array.isArray(value.qualityOfLanguage.errors)
  );
}

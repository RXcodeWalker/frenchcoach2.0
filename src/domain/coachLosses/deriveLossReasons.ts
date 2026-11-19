// ── Derive "why marks were lost" from an attempt's persisted marking ──────────────
//
// Pure. Reads an EnvelopeView (already built by the scoring service from the
// persisted ScoringEnvelope) and, when there is one, the post-marking report.
// Nothing here is a mark: every number is copied from the view, and every rule
// below is a plain comparison against the maximum the rubric already prints.
//
// What it will NOT do: guess. The view does not say which PART of a role-play
// task was missing, and the unvalidated L1 heuristics (time-frame alignment,
// filler density) were never the judge's reason for a mark — so neither is read.
// A reason exists only where the persisted marking itself names it:
//   • a role-play task credited below 2 (and whether it was silent, or the report
//     found an error that impeded communication — RP_MARK_1's own bullet);
//   • the band-above descriptor the report's next step aimed at (a verbatim
//     bullet from the frozen TN tables, so the mapping below is a closed set);
//   • the categories of the Quality-of-language errors the envelope listed.

import type { EnvelopeView } from '../igcse/envelope/envelopeView';
import type { ExamFeedbackReport } from '../examFeedback/types';
import type { ErrorCategory } from '../examFeedback/shared/errorCategories';
import {
  COMM_1_3,
  COMM_4_6,
  COMM_7_9,
  COMM_10_12,
  COMM_13_15,
  QOL_1_3,
  QOL_4_6,
  QOL_7_9,
  QOL_10_12,
  QOL_13_15,
} from '../igcse/canonical';
import type { LossReason, LossReasonCode } from './types';

/** Role-play marks per task and the Communication / QoL maxima (TN p.10–12). */
export const ROLE_PLAY_TASK_MAX = 2;
export const COMMUNICATION_MAX = 15;
export const QUALITY_OF_LANGUAGE_MAX = 15;

/**
 * UNVALIDATED. Fewest errors in one category before the coach says "most of your
 * mistakes were X" — below this the QoL reason falls back to the report's
 * band-above descriptor.
 */
export const MIN_CATEGORY_ERRORS = 2;

// ── The descriptor → reason table (closed: every TN bullet is listed) ─────────────

const COMM_CODES: ReadonlyArray<readonly [readonly string[], readonly LossReasonCode[]]> = [
  [COMM_13_15, ['comm_responds', 'comm_relevant', 'comm_develop', 'comm_justify']],
  [COMM_10_12, ['comm_responds', 'comm_relevant', 'comm_develop', 'comm_justify']],
  [COMM_7_9, ['comm_responds', 'comm_relevant', 'comm_develop']],
  [COMM_4_6, ['comm_responds', 'comm_relevant']],
  [COMM_1_3, ['comm_responds', 'comm_relevant']],
];

const QOL_CODES: ReadonlyArray<readonly [readonly string[], readonly LossReasonCode[]]> = [
  [QOL_13_15, ['qol_structures', 'qol_vocabulary', 'qol_fluency']],
  [QOL_10_12, ['qol_structures', 'qol_vocabulary', 'qol_fluency']],
  [QOL_7_9, ['qol_structures', 'qol_vocabulary', 'qol_fluency']],
  [QOL_4_6, ['qol_structures', 'qol_fluency']],
  [QOL_1_3, ['qol_structures', 'qol_fluency']],
];

function tableLookup(table: typeof COMM_CODES): Map<string, LossReasonCode> {
  const map = new Map<string, LossReasonCode>();
  for (const [bullets, codes] of table) bullets.forEach((text, i) => { if (codes[i] && !map.has(text)) map.set(text, codes[i]); });
  return map;
}

const COMM_BY_DESCRIPTOR = tableLookup(COMM_CODES);
const QOL_BY_DESCRIPTOR = tableLookup(QOL_CODES);

/** The reason code for a Communication next step's `targetDescriptor` (null = not a TN p.11 bullet). Exported for the table's coverage test. */
export function commReasonForDescriptor(text: string | null | undefined): LossReasonCode | null {
  return (text && COMM_BY_DESCRIPTOR.get(text)) || null;
}

/** The reason code for a Quality-of-language next step's `targetDescriptor` (null = not a TN p.12 bullet). */
export function qolReasonForDescriptor(text: string | null | undefined): LossReasonCode | null {
  return (text && QOL_BY_DESCRIPTOR.get(text)) || null;
}

// ── Derivation ────────────────────────────────────────────────────────────────

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function rolePlayReasons(view: EnvelopeView, report: ExamFeedbackReport | null): LossReason[] {
  const grouped = new Map<LossReasonCode, { below: number; mark: number; count: number }>();
  for (const task of view.criteria) {
    if (task.criterion !== 'rolePlayTask' || task.mark >= ROLE_PLAY_TASK_MAX) continue;
    const response = view.evidenceGroups.find((g) => g.part === 'rolePlay' && g.questionOrTaskId === task.taskId)?.candidateResponse ?? '';
    let code: LossReasonCode;
    if (task.mark === 0 && words(response) === 0) code = 'rp_silent';
    else if (!report || task.mark !== 1) code = 'rp_below_full';
    else code = report.rolePlay.tasks.find((t) => t.taskId === task.taskId)?.error ? 'rp_errors_impede' : 'rp_partly_communicated';
    const g = grouped.get(code) ?? { below: 0, mark: 0, count: 0 };
    g.below += ROLE_PLAY_TASK_MAX - task.mark;
    g.mark += task.mark;
    g.count += 1;
    grouped.set(code, g);
  }
  return [...grouped.entries()].map(([code, g]) => ({
    code, area: 'rolePlay' as const, marksBelowMax: g.below, mark: g.mark, max: g.count * ROLE_PLAY_TASK_MAX, count: g.count,
  }));
}

function communicationReason(view: EnvelopeView, report: ExamFeedbackReport | null): LossReason | null {
  const crit = view.criteria.find((c) => c.criterion === 'communication');
  if (!crit || crit.mark >= COMMUNICATION_MAX) return null;
  const code = commReasonForDescriptor(report?.communication.nextStep?.targetDescriptor) ?? 'comm_below_top';
  return { code, area: 'communication', marksBelowMax: COMMUNICATION_MAX - crit.mark, mark: crit.mark, max: COMMUNICATION_MAX, count: 0 };
}

function dominantCategory(report: ExamFeedbackReport): { category: ErrorCategory; count: number } | null {
  const counts = new Map<ErrorCategory, number>();
  for (const e of report.qualityOfLanguage.errors) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  let best: { category: ErrorCategory; count: number } | null = null;
  for (const [category, count] of counts) if (!best || count > best.count) best = { category, count };
  return best;
}

function qualityReason(view: EnvelopeView, report: ExamFeedbackReport | null): LossReason | null {
  const crit = view.criteria.find((c) => c.criterion === 'qualityOfLanguage');
  if (!crit || crit.mark >= QUALITY_OF_LANGUAGE_MAX) return null;
  const base = { area: 'qualityOfLanguage' as const, marksBelowMax: QUALITY_OF_LANGUAGE_MAX - crit.mark, mark: crit.mark, max: QUALITY_OF_LANGUAGE_MAX };
  const total = crit.errors?.length ?? 0;
  const dominant = report ? dominantCategory(report) : null;
  if (dominant && dominant.count >= MIN_CATEGORY_ERRORS) {
    return { ...base, code: 'qol_errors', count: dominant.count, category: dominant.category, total: Math.max(total, report?.qualityOfLanguage.errors.length ?? 0) };
  }
  // No report: the envelope's list has no categories, so only the count is known.
  if (!report && total >= MIN_CATEGORY_ERRORS) return { ...base, code: 'qol_errors', count: total, total };
  return { ...base, code: qolReasonForDescriptor(report?.qualityOfLanguage.nextStep?.targetDescriptor) ?? 'qol_below_top', count: 0 };
}

/** Largest gap first (ties: role play, communication, quality of language). */
export function rankLossReasons(reasons: LossReason[]): LossReason[] {
  const order = { rolePlay: 0, communication: 1, qualityOfLanguage: 2 } as const;
  return [...reasons].sort((a, b) => b.marksBelowMax - a.marksBelowMax || order[a.area] - order[b.area]);
}

/**
 * Every reason an attempt fell short of full marks, biggest gap first. `report`
 * is optional: without it role-play and QoL reasons are coarser, never different
 * in kind (no code is derived from anything but the persisted marking).
 */
export function deriveLossReasons(view: EnvelopeView, report: ExamFeedbackReport | null = null): LossReason[] {
  const out = rolePlayReasons(view, report);
  const comm = communicationReason(view, report);
  if (comm) out.push(comm);
  const qol = qualityReason(view, report);
  if (qol) out.push(qol);
  return rankLossReasons(out);
}

// ── The device's copy of "why marks were lost" — pure parse and merge ────────────
//
// storage half: services/coach/examLossStore.ts. A malformed or older-version blob
// reads as empty (the reasons are re-derivable from the server's persisted
// envelope, so dropping them costs one backfill, never data).

import type { ExamLossRecord, ExamLossStore, LossReason, LossReasonCode } from './types';

export const EXAM_LOSS_STORE_VERSION = 1;
/** Attempts kept, newest first: the coach reads only the latest, a few more cover a retried backfill. */
export const MAX_LOSS_RECORDS = 6;

const CODES: ReadonlySet<string> = new Set<LossReasonCode>([
  'rp_silent', 'rp_errors_impede', 'rp_partly_communicated', 'rp_below_full',
  'comm_responds', 'comm_relevant', 'comm_develop', 'comm_justify', 'comm_below_top',
  'qol_errors', 'qol_structures', 'qol_vocabulary', 'qol_fluency', 'qol_below_top',
]);
const AREAS: ReadonlySet<string> = new Set(['rolePlay', 'communication', 'qualityOfLanguage']);
const CATEGORIES: ReadonlySet<string> = new Set(['tense', 'verb_form', 'auxiliary', 'agreement', 'gender', 'preposition', 'word_order', 'vocabulary', 'other']);

export const EMPTY_LOSS_STORE: ExamLossStore = { version: EXAM_LOSS_STORE_VERSION, records: [] };

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseReason(raw: unknown): LossReason | null {
  const r = raw as Partial<LossReason> | null;
  if (!r || typeof r !== 'object') return null;
  if (typeof r.code !== 'string' || !CODES.has(r.code) || typeof r.area !== 'string' || !AREAS.has(r.area)) return null;
  if (!num(r.marksBelowMax) || !num(r.mark) || !num(r.max) || !num(r.count)) return null;
  const out: LossReason = { code: r.code as LossReasonCode, area: r.area as LossReason['area'], marksBelowMax: r.marksBelowMax, mark: r.mark, max: r.max, count: r.count };
  if (typeof r.category === 'string' && CATEGORIES.has(r.category)) out.category = r.category as LossReason['category'];
  if (num(r.total)) out.total = r.total;
  return out;
}

function parseRecord(raw: unknown): ExamLossRecord | null {
  const r = raw as Partial<ExamLossRecord> | null;
  if (!r || typeof r !== 'object' || typeof r.sessionId !== 'string' || r.sessionId.length === 0) return null;
  if (typeof r.scoredAt !== 'string' || typeof r.hasReport !== 'boolean' || !Array.isArray(r.reasons)) return null;
  const reasons = r.reasons.map(parseReason).filter((x): x is LossReason => x !== null);
  return { sessionId: r.sessionId, scoredAt: r.scoredAt, hasReport: r.hasReport, reasons };
}

export function parseExamLossStore(raw: unknown): ExamLossStore {
  const s = raw as Partial<ExamLossStore> | null;
  if (!s || typeof s !== 'object' || s.version !== EXAM_LOSS_STORE_VERSION || !Array.isArray(s.records)) return EMPTY_LOSS_STORE;
  return { version: EXAM_LOSS_STORE_VERSION, records: s.records.map(parseRecord).filter((x): x is ExamLossRecord => x !== null).slice(0, MAX_LOSS_RECORDS) };
}

/**
 * Add or replace one attempt's record. A report-backed record is never replaced
 * by an envelope-only one (the report only ever refines). Returns the same object
 * when nothing changes.
 */
export function upsertLossRecord(store: ExamLossStore, record: ExamLossRecord): ExamLossStore {
  const existing = store.records.find((r) => r.sessionId === record.sessionId);
  if (existing && existing.hasReport && !record.hasReport) return store;
  if (existing && JSON.stringify(existing) === JSON.stringify(record)) return store;
  const rest = store.records.filter((r) => r.sessionId !== record.sessionId);
  return { version: EXAM_LOSS_STORE_VERSION, records: [record, ...rest].slice(0, MAX_LOSS_RECORDS) };
}

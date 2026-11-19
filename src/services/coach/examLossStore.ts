// ── Why marks were lost: storage half ─────────────────────────────────────────────
//
// Keeps, per counted Exam Sim, the reason codes derived from what the scoring
// service persisted (domain/coachLosses/). Three writers, all read-only with
// respect to marks:
//   • ExamMode, the moment an attempt is marked (envelope view in hand);
//   • the results screen, when the post-marking report arrives (refines the record);
//   • examLossBackfill.ts, for an attempt marked before this existed or on
//     another device (the network half, kept apart so Home doesn't download the
//     scoring client until it needs it).
//
// LOCAL ONLY (no sync, no request body, no analytics event); removed by
// deleteMyAccount(). Codes and counts only — no transcript, quote or answer text.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { deriveLossReasons } from '../../domain/coachLosses/deriveLossReasons';
import { parseExamLossStore, upsertLossRecord } from '../../domain/coachLosses/store';
import type { ExamLossRecord, ExamLossStore } from '../../domain/coachLosses/types';
import type { EnvelopeView } from '../../domain/igcse/envelope/envelopeView';
import type { ExamFeedbackReport } from '../../domain/examFeedback/types';

export function readExamLossStore(): ExamLossStore {
  return parseExamLossStore(storageGet<unknown>(STORAGE_KEYS.coachExamLosses, null));
}

/** The reasons for one scoring session, if the device has them. */
export function readExamLossRecord(scoringSessionId: string): ExamLossRecord | null {
  return readExamLossStore().records.find((r) => r.sessionId === scoringSessionId) ?? null;
}

export function recordFromView(view: EnvelopeView, report: ExamFeedbackReport | null): ExamLossRecord {
  return { sessionId: view.sessionId, scoredAt: view.scoredAt, hasReport: report !== null, reasons: deriveLossReasons(view, report) };
}

export function writeExamLossRecord(record: ExamLossRecord): boolean {
  const before = readExamLossStore();
  const after = upsertLossRecord(before, record);
  if (after === before) return false;
  storageSet(STORAGE_KEYS.coachExamLosses, after);
  return true;
}

/** A counted attempt was just marked: keep its reasons. Never throws. */
export function recordExamLosses(view: EnvelopeView, report: ExamFeedbackReport | null = null): void {
  try {
    writeExamLossRecord(recordFromView(view, report));
  } catch {
    // Bookkeeping for the coach; the exam result never depends on it.
  }
}

/**
 * The post-marking report arrived: refine the record — but only one that already
 * exists (an attempt that doesn't count never got one, and must not start now).
 */
export function refineExamLosses(view: EnvelopeView, report: ExamFeedbackReport): void {
  try {
    if (readExamLossRecord(view.sessionId)) writeExamLossRecord(recordFromView(view, report));
  } catch {
    // see recordExamLosses
  }
}

// ── Backfill "why marks were lost" from the server's persisted marking ────────────
//
// The network half of examLossStore.ts, loaded on demand by Home. Re-reads the
// persisted envelope (GET /score) and any already-stored report (GET /feedback) —
// both free reads: no model call, no quota charge, no new marking. Read-only with
// respect to marks (ADR 0009).

import { getSessionHistory } from '../analytics/analyticsService';
import { examSummary } from '../../features/progress/progressSummary';
import { fetchStoredExamFeedback, pollScoreStatus } from '../exam/scoringApiClient';
import type { EnvelopeView } from '../../domain/igcse/envelope/envelopeView';
import { readExamLossRecord, recordFromView, writeExamLossRecord } from './examLossStore';

const DAY_MS = 86_400_000;
/** An envelope-only record is re-checked for a report only while the attempt is this recent. */
const REPORT_RECHECK_DAYS = 14;

/** Sessions already tried this page load (a failed read is retried on the next load, not in a loop). */
const triedThisLoad = new Set<string>();

/**
 * Backfill the newest counted Exam Sim's reasons when the device has none
 * (marked before this feature, or on another device), or only an envelope-only
 * record while a report may exist now. Resolves true when the store changed.
 * Never throws; signed-out or offline reads simply fail.
 */
export async function ensureExamLossRecord(now: number = Date.now()): Promise<boolean> {
  try {
    const sessions = getSessionHistory();
    const latest = examSummary(sessions).counted[0];
    const session = latest ? sessions.find((s) => s.id === latest.id) : undefined;
    const scoringId = session?.scoringSessionId;
    if (!session || !scoringId) return false;
    const existing = readExamLossRecord(scoringId);
    if (existing?.hasReport || triedThisLoad.has(scoringId)) return false;
    if (existing && now - new Date(session.date).getTime() > REPORT_RECHECK_DAYS * DAY_MS) return false;
    triedThisLoad.add(scoringId);

    const report = await fetchStoredExamFeedback(scoringId).catch(() => null);
    if (existing && !report) return false;
    const status = await pollScoreStatus(scoringId);
    if (status.status !== 'done') return false;
    const view: EnvelopeView = status.envelope;
    return writeExamLossRecord(recordFromView(view, report));
  } catch {
    return false;
  }
}

/** Test seam: forget which sessions were tried this page load. */
export function resetExamLossBackfillForTests(): void {
  triedThisLoad.clear();
}

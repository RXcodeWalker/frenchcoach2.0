/**
 * Local persistence for pronunciation attempt history (accent-analyzer plan
 * §13, D3). Mirrors coachStorage.ts's bounded-ring-buffer shape: a thin,
 * fail-safe localStorage wrapper, capped so storage never grows unbounded
 * (plan §12: "Local history ring-buffers at 200 attempts").
 *
 * The `assessorVersion` trap (plan §13): history mixes records from the
 * whisper-heuristic tier (a rescaled alignment score) and the Azure
 * phoneme-authoritative tier. `segmentHistoryForTrend` is the mechanism that
 * keeps a v2/v3 or tier boundary from being silently interpolated across —
 * callers building a chart must use it rather than iterating the raw list.
 */

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { PronunciationAssessment } from '../../domain/pronunciation/types';

export const MAX_PRONUNCIATION_ATTEMPTS = 200;

export interface PronunciationAttemptRecord {
  id: string;
  createdAt: string; // ISO
  mode: 'scripted' | 'freeform';
  locale: string;
  provider: PronunciationAssessment['provider'];
  assessorVersion: string;
  score: number | null;
  couldNotAssess: boolean;
  confidenceOverall: number | null;
  referenceText: string;
  transcript: string;
}

export function assessmentToAttemptRecord(
  id: string,
  referenceText: string,
  assessment: PronunciationAssessment,
): PronunciationAttemptRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    mode: assessment.mode ?? 'scripted',
    locale: assessment.locale ?? 'fr-FR',
    provider: assessment.provider,
    assessorVersion: assessment.assessorVersion ?? 'unknown',
    score: assessment.score,
    couldNotAssess: assessment.couldNotAssess,
    confidenceOverall: assessment.confidence?.overall ?? null,
    // Truncated per plan §12, mirroring sessionSync's transcript truncation.
    referenceText: referenceText.slice(0, 500),
    transcript: assessment.transcript.slice(0, 2000),
  };
}

export function getPronunciationHistory(): PronunciationAttemptRecord[] {
  return storageGet<PronunciationAttemptRecord[]>(STORAGE_KEYS.pronunciationHistory, []);
}

/** Append one attempt, keeping only the most recent MAX_PRONUNCIATION_ATTEMPTS. */
export function appendPronunciationAttempt(record: PronunciationAttemptRecord): PronunciationAttemptRecord[] {
  const existing = getPronunciationHistory();
  const next = [...existing, record].slice(-MAX_PRONUNCIATION_ATTEMPTS);
  storageSet(STORAGE_KEYS.pronunciationHistory, next);
  return next;
}

export function setPronunciationHistory(records: PronunciationAttemptRecord[]): void {
  storageSet(STORAGE_KEYS.pronunciationHistory, records.slice(-MAX_PRONUNCIATION_ATTEMPTS));
}

/**
 * A trend-eligible segment: attempts sharing one (assessorVersion, provider)
 * pair, in chronological order. Plan §13: "Trend calculations segment by
 * (assessorVersion, provider); the chart breaks the line at a boundary and
 * labels it, rather than interpolating across." Pre-v3 and whisper-heuristic
 * records structurally have no phoneme data — they still form their own
 * segment (for the raw score line) but must never be merged with an Azure
 * segment.
 */
export interface PronunciationHistorySegment {
  assessorVersion: string;
  provider: PronunciationAssessment['provider'];
  attempts: PronunciationAttemptRecord[];
}

export function segmentHistoryForTrend(
  records: PronunciationAttemptRecord[],
): PronunciationHistorySegment[] {
  const sorted = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const segments: PronunciationHistorySegment[] = [];

  for (const record of sorted) {
    const last = segments[segments.length - 1];
    if (last && last.assessorVersion === record.assessorVersion && last.provider === record.provider) {
      last.attempts.push(record);
    } else {
      segments.push({ assessorVersion: record.assessorVersion, provider: record.provider, attempts: [record] });
    }
  }

  return segments;
}

/**
 * Phoneme-level trends (plan §13) are only meaningful for authoritative-tier
 * (Azure) results — the whisper-heuristic tier has no per-word accuracy, so
 * including it would silently weight nulls. Segments from any other
 * provider are excluded entirely, not just skipped in the average.
 */
export function segmentsForPhonemeTrend(
  segments: PronunciationHistorySegment[],
): PronunciationHistorySegment[] {
  return segments.filter(s => s.provider === 'azure');
}

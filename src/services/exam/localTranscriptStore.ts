/**
 * S10 browser TranscriptStore — implements the existing stt/ports.ts port over
 * localStorage. Stores a map of sessionId -> SessionTranscript.
 */

import { parseSessionTranscript } from '../../domain/igcse/stt/schema';
import type { TranscriptStore } from '../../domain/igcse/stt/ports';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { SimulationSessionSnapshot } from './simulationSession';

type TranscriptMap = Record<string, SessionTranscript>;

/** Cap on stored transcripts — practice exams accumulate indefinitely otherwise; keep only the most recent. */
const MAX_STORED_TRANSCRIPTS = 20;

function readAll(): TranscriptMap {
  return storageGet<TranscriptMap>(STORAGE_KEYS.examTranscripts, {});
}

function evictStale(all: TranscriptMap): void {
  const keys = Object.keys(all);
  if (keys.length > MAX_STORED_TRANSCRIPTS) {
    for (const staleKey of keys.slice(0, keys.length - MAX_STORED_TRANSCRIPTS)) {
      delete all[staleKey];
    }
  }
}

export function createLocalTranscriptStore(): TranscriptStore {
  return {
    async save(t: SessionTranscript): Promise<void> {
      const all = readAll();
      delete all[t.sessionId];
      all[t.sessionId] = t;
      evictStale(all);
      storageSet(STORAGE_KEYS.examTranscripts, all);
    },
    async load(sessionId: string): Promise<SessionTranscript> {
      const all = readAll();
      const found = all[sessionId];
      if (!found) throw new Error(`localTranscriptStore: no transcript for sessionId "${sessionId}"`);
      return parseSessionTranscript(found);
    },
    async list(): Promise<string[]> {
      return Object.keys(readAll());
    },
  };
}

export function getStoredTranscript(sessionId: string): SessionTranscript | null {
  const all = readAll();
  const found = all[sessionId];
  return found ? parseSessionTranscript(found) : null;
}

export function saveStoredTranscript(t: SessionTranscript): void {
  const all = readAll();
  delete all[t.sessionId];
  all[t.sessionId] = t;
  evictStale(all);
  storageSet(STORAGE_KEYS.examTranscripts, all);
}

/**
 * Reliability plan §D — resume-on-reload marker. The transcript itself is
 * already durable via saveStoredTranscript; this is just "which sessionId,
 * if any, was submitted for scoring but hasn't reached Completed yet" so a
 * reload during 'scoring' (or after a failure) can find it. Cleared once the
 * exam-scoring state machine reaches Completed. A plain string, not a set —
 * ExamMode only ever runs one exam session at a time.
 */
export function getPendingScoreSessionId(): string | null {
  return storageGet<string | null>(STORAGE_KEYS.examPendingScoreSessionId, null);
}

export function setPendingScoreSessionId(sessionId: string): void {
  storageSet(STORAGE_KEYS.examPendingScoreSessionId, sessionId);
}

export function clearPendingScoreSessionId(): void {
  storageSet(STORAGE_KEYS.examPendingScoreSessionId, null);
}

/**
 * W7 reliability: mid-exam (running-phase) resume-on-reload. A SessionTranscript
 * can't represent this — buildTranscript() throws until the session reaches
 * 'complete' — so this stores enough of SimulationSession's own state
 * (ConductEngineState + the ConductLog entries so far + the last examiner action)
 * to reconstruct it. `questionSetId` is re-resolved through the normal
 * loader.ts path on resume (backend-first, offline-fixture fallback) rather
 * than persisting the question set itself. A plain object, not a set — like
 * examPendingScoreSessionId, ExamMode only ever runs one exam session at a time.
 */
export interface RunningSessionSnapshot {
  sessionId: string;
  questionSetId: string;
  coached: boolean;
  /** Value useElapsedClock's start() should resume from, so the on-screen total doesn't reset to 0. */
  totalElapsedS: number;
  session: SimulationSessionSnapshot;
}

export function getRunningSession(): RunningSessionSnapshot | null {
  return storageGet<RunningSessionSnapshot | null>(STORAGE_KEYS.examRunningSession, null);
}

export function saveRunningSession(snapshot: RunningSessionSnapshot): void {
  storageSet(STORAGE_KEYS.examRunningSession, snapshot);
}

export function clearRunningSession(): void {
  storageSet(STORAGE_KEYS.examRunningSession, null);
}

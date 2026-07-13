/**
 * S10 ConductLog persistence — kept separate from the scored SessionTranscript
 * (schema unchanged) but retained as the durable debug/replay artifact. Exposes
 * a dev console handle (window.__frenchExam) so a log can be pulled mid/post-
 * session without digging through localStorage.
 */

import type { ConductLog } from '../../domain/igcse/session/types';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

type ConductLogMap = Record<string, ConductLog>;

function readAll(): ConductLogMap {
  return storageGet<ConductLogMap>(STORAGE_KEYS.examConductLogs, {});
}

export function saveConductLog(log: ConductLog): void {
  const all = readAll();
  all[log.sessionId] = log;
  storageSet(STORAGE_KEYS.examConductLogs, all);
}

export function getConductLog(sessionId: string): ConductLog | null {
  return readAll()[sessionId] ?? null;
}

export function listConductLogs(): string[] {
  return Object.keys(readAll());
}

export function exportConductLogJson(sessionId: string): string {
  const log = getConductLog(sessionId);
  if (!log) throw new Error(`conductLogStore: no ConductLog for sessionId "${sessionId}"`);
  return JSON.stringify(log, null, 2);
}

/** Triggers a browser download of the ConductLog as conduct-log-<sessionId>.json — no server round-trip. */
export function downloadConductLog(sessionId: string): void {
  const json = exportConductLogJson(sessionId);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conduct-log-${sessionId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

declare global {
  interface Window {
    __frenchExam?: {
      getConductLog: typeof getConductLog;
      listConductLogs: typeof listConductLogs;
      exportConductLogJson: typeof exportConductLogJson;
    };
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__frenchExam = { getConductLog, listConductLogs, exportConductLogJson };
}

/**
 * S10 browser TranscriptStore — implements the existing stt/ports.ts port over
 * localStorage. Stores a map of sessionId -> SessionTranscript.
 */

import { parseSessionTranscript } from '../../domain/igcse/stt/schema';
import type { TranscriptStore } from '../../domain/igcse/stt/ports';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

type TranscriptMap = Record<string, SessionTranscript>;

function readAll(): TranscriptMap {
  return storageGet<TranscriptMap>(STORAGE_KEYS.examTranscripts, {});
}

export function createLocalTranscriptStore(): TranscriptStore {
  return {
    async save(t: SessionTranscript): Promise<void> {
      const all = readAll();
      all[t.sessionId] = t;
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
  all[t.sessionId] = t;
  storageSet(STORAGE_KEYS.examTranscripts, all);
}

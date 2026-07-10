/**
 * TranscriptStore over an in-memory fixture map. What S4/S5 tests inject to
 * exercise the real TranscriptStore port without touching the filesystem.
 */

import { parseSessionTranscript } from '../schema';
import type { TranscriptStore } from '../ports';
import type { SessionTranscript } from '../types';

export function createFixtureTranscriptStore(
  fixtures: Record<string, unknown>,
): TranscriptStore {
  const store = new Map<string, SessionTranscript>();
  for (const [sessionId, raw] of Object.entries(fixtures)) {
    store.set(sessionId, parseSessionTranscript(raw));
  }

  return {
    async save(t: SessionTranscript): Promise<void> {
      store.set(t.sessionId, t);
    },
    async load(sessionId: string): Promise<SessionTranscript> {
      const found = store.get(sessionId);
      if (!found) {
        throw new Error(`FixtureTranscriptStore: no transcript for sessionId "${sessionId}"`);
      }
      return found;
    },
    async list(): Promise<string[]> {
      return Array.from(store.keys());
    },
  };
}

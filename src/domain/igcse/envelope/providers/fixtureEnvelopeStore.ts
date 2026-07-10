/**
 * EnvelopeStore over an in-memory fixture map. Mirrors
 * stt/providers/fixtureTranscriptStore.ts — what tests inject to exercise the
 * real EnvelopeStore port without touching the filesystem.
 */

import { parseScoringEnvelope } from '../schema';
import type { EnvelopeStore } from '../ports';
import type { ScoringEnvelope } from '../types';

export function createFixtureEnvelopeStore(fixtures: Record<string, unknown>): EnvelopeStore {
  const store = new Map<string, ScoringEnvelope>();
  for (const [attemptId, raw] of Object.entries(fixtures)) {
    store.set(attemptId, parseScoringEnvelope(raw));
  }

  return {
    async save(envelope: ScoringEnvelope): Promise<void> {
      store.set(envelope.attemptId, envelope);
    },
    async load(attemptId: string): Promise<ScoringEnvelope> {
      const found = store.get(attemptId);
      if (!found) {
        throw new Error(`FixtureEnvelopeStore: no envelope for attemptId "${attemptId}"`);
      }
      return found;
    },
    async list(): Promise<string[]> {
      return Array.from(store.keys());
    },
    async listBySession(sessionId: string): Promise<ScoringEnvelope[]> {
      return Array.from(store.values()).filter((e) => e.sessionId === sessionId);
    },
  };
}

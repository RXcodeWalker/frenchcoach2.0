/**
 * S4 EnvelopeStore port — mirrors stt/ports.ts's TranscriptStore convention.
 * Keyed by attemptId (not sessionId) so a session can be scored more than once
 * (regrades). listBySession scans and filters rather than maintaining a second
 * index, same pattern fileTranscriptStore.list() already uses.
 */

import type { ScoringEnvelope } from './types';

export interface EnvelopeStore {
  save(envelope: ScoringEnvelope): Promise<void>;
  load(attemptId: string): Promise<ScoringEnvelope>;
  list(): Promise<string[]>;
  listBySession(sessionId: string): Promise<ScoringEnvelope[]>;
}

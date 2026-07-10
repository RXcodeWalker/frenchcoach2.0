/**
 * S4 impure EnvelopeStore over the local gitignored filesystem — mirrors
 * scripts/stt/fileTranscriptStore.ts's shape exactly.
 *
 *   data/envelopes/<attemptId>/envelope.json
 *
 * Keyed by attemptId, not sessionId — a session can be scored more than once
 * (regrades). listBySession scans and filters embedded sessionId rather than
 * maintaining a manifest, same pattern fileTranscriptStore.list() uses.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseScoringEnvelope } from '../../src/domain/igcse/envelope/schema';
import type { EnvelopeStore } from '../../src/domain/igcse/envelope/ports';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';

export function createFileEnvelopeStore(envelopesRoot: string): EnvelopeStore {
  const envelopePath = (attemptId: string) => path.join(envelopesRoot, attemptId, 'envelope.json');

  return {
    async save(envelope: ScoringEnvelope): Promise<void> {
      const dir = path.join(envelopesRoot, envelope.attemptId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(envelopePath(envelope.attemptId), JSON.stringify(envelope, null, 2) + '\n', 'utf8');
    },
    async load(attemptId: string): Promise<ScoringEnvelope> {
      const raw = await fs.readFile(envelopePath(attemptId), 'utf8');
      return parseScoringEnvelope(JSON.parse(raw));
    },
    async list(): Promise<string[]> {
      const entries = await fs.readdir(envelopesRoot, { withFileTypes: true });
      const attemptIds: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          await fs.access(envelopePath(entry.name));
          attemptIds.push(entry.name);
        } catch {
          // No envelope.json yet for this dir — not a scored attempt, skip.
        }
      }
      return attemptIds;
    },
    async listBySession(sessionId: string): Promise<ScoringEnvelope[]> {
      const attemptIds = await this.list();
      const envelopes: ScoringEnvelope[] = [];
      for (const attemptId of attemptIds) {
        const envelope = await this.load(attemptId);
        if (envelope.sessionId === sessionId) envelopes.push(envelope);
      }
      return envelopes;
    },
  };
}

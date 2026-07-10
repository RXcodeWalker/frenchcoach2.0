/**
 * S3 impure TranscriptStore over the local gitignored filesystem — the system of
 * record for session transcripts (04 §6.1: teacher recordings and TN material are
 * internal scoring/validation use only, never redistributed, never pooled).
 *
 *   data/sessions/<sessionId>/
 *     audio.wav
 *     questions.json     (SessionQuestionSet)
 *     raw-asr.json        (untouched vendor output, for forensics)
 *     transcript.json      (SessionTranscript)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseSessionTranscript } from '../../src/domain/igcse/stt/schema';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import type { SessionTranscript } from '../../src/domain/igcse/stt/types';

export function createFileTranscriptStore(sessionsRoot: string): TranscriptStore {
  const transcriptPath = (sessionId: string) => path.join(sessionsRoot, sessionId, 'transcript.json');

  return {
    async save(t: SessionTranscript): Promise<void> {
      const dir = path.join(sessionsRoot, t.sessionId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(transcriptPath(t.sessionId), JSON.stringify(t, null, 2) + '\n', 'utf8');
    },
    async load(sessionId: string): Promise<SessionTranscript> {
      const raw = await fs.readFile(transcriptPath(sessionId), 'utf8');
      return parseSessionTranscript(JSON.parse(raw));
    },
    async list(): Promise<string[]> {
      const entries = await fs.readdir(sessionsRoot, { withFileTypes: true });
      const sessionIds: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          await fs.access(transcriptPath(entry.name));
          sessionIds.push(entry.name);
        } catch {
          // No transcript.json yet for this session dir — not ingested, skip.
        }
      }
      return sessionIds;
    },
  };
}

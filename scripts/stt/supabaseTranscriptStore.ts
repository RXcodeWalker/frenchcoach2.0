/**
 * S3 impure TranscriptStore over Supabase. Carries derived transcripts only, and
 * only for sessions that are legally redistributable — save() calls
 * assertRedistributable() as its first statement and throws before any network
 * call for 'confidential-internal' sessions. Audio and raw-asr.json are never
 * uploaded; only the SessionTranscript's stt block and transcript JSON.
 */

import { createClient } from '@supabase/supabase-js';
import { assertRedistributable } from '../../src/domain/igcse/judgement/scoreSpeaking';
import type { SpeakingTranscript } from '../../src/domain/igcse/judgement/types';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import type { SessionTranscript } from '../../src/domain/igcse/stt/types';

export interface SupabaseTranscriptStoreOptions {
  url: string;
  serviceKey: string;
  /**
   * Caller-supplied at construction, once per authenticated request (A3/A6).
   * The service key bypasses RLS, so this is the *only* owner-enforcement
   * point for the server path: every read (load/list/getLastAttemptAt)
   * filters `user_id = options.userId`, and save() refuses to upsert over a
   * row owned by a different user (the PK is `session_id` alone, so an
   * unchecked upsert would silently overwrite a foreign row). Exam IDOR fix
   * (Phase 1.1).
   */
  userId: string;
}

/**
 * Thrown by save() when a session_transcripts row already exists for this
 * sessionId under a *different* user_id. The PK is session_id alone, so an
 * unchecked upsert would clobber the foreign row (including its user_id);
 * this app-level ownership check is the smaller, lower-risk fix than
 * re-keying the table. Exam IDOR fix (Phase 1.1).
 */
export class TranscriptOwnershipError extends Error {
  constructor(sessionId: string) {
    super(`session_transcripts row for "${sessionId}" is owned by another user`);
    this.name = 'TranscriptOwnershipError';
  }
}

/**
 * assertRedistributable only reads `.contentProvenance` — SessionTranscript and
 * SpeakingTranscript share that field's type, so this narrow structural cast is
 * safe without pulling stt/ into a dependency on the full SpeakingTranscript shape.
 */
function checkRedistributable(session: SessionTranscript): void {
  assertRedistributable({ contentProvenance: session.contentProvenance } as SpeakingTranscript);
}

/**
 * Server-only staleness lookup for GET /score's 3-way response (not part of
 * the shared TranscriptStore port — scoreAttempt.ts never needs this).
 * Returns null if no transcript row exists for this sessionId.
 */
export async function getLastAttemptAt(
  options: SupabaseTranscriptStoreOptions,
  sessionId: string,
): Promise<Date | null> {
  const client = createClient(options.url, options.serviceKey);
  const { data, error } = await client
    .from('session_transcripts')
    .select('last_attempt_at')
    .eq('session_id', sessionId)
    .eq('user_id', options.userId)
    .maybeSingle();
  if (error || !data) return null;
  return new Date(data.last_attempt_at as string);
}

export function createSupabaseTranscriptStore(options: SupabaseTranscriptStoreOptions): TranscriptStore {
  const client = createClient(options.url, options.serviceKey);

  return {
    async save(t: SessionTranscript): Promise<void> {
      checkRedistributable(t);

      // The PK is session_id alone, so an unchecked upsert would silently
      // overwrite a row owned by another user (including its user_id). Refuse
      // that instead of re-keying the table — smaller, lower-risk, and leaves
      // existing data untouched. Exam IDOR fix (Phase 1.1).
      const { data: existing, error: ownerError } = await client
        .from('session_transcripts')
        .select('user_id')
        .eq('session_id', t.sessionId)
        .maybeSingle();
      if (ownerError) {
        throw new Error(`SupabaseTranscriptStore.save ownership check failed: ${ownerError.message}`);
      }
      if (existing && (existing as { user_id: string }).user_id !== options.userId) {
        throw new TranscriptOwnershipError(t.sessionId);
      }

      const { error } = await client.from('session_transcripts').upsert({
        session_id: t.sessionId,
        user_id: options.userId,
        schema_version: t.schemaVersion,
        content_provenance: t.contentProvenance,
        stt: t.stt,
        transcript: t,
        // Stamped on every save (not just insert) so GET /score can tell a
        // recent attempt from an abandoned one — see the migration's comment.
        last_attempt_at: new Date().toISOString(),
      });
      if (error) {
        throw new Error(`SupabaseTranscriptStore.save failed: ${error.message}`);
      }
    },
    async load(sessionId: string): Promise<SessionTranscript> {
      const { data, error } = await client
        .from('session_transcripts')
        .select('transcript')
        .eq('session_id', sessionId)
        .eq('user_id', options.userId)
        .single();
      if (error || !data) {
        throw new Error(`SupabaseTranscriptStore.load failed for "${sessionId}": ${error?.message}`);
      }
      return data.transcript as SessionTranscript;
    },
    async list(): Promise<string[]> {
      const { data, error } = await client
        .from('session_transcripts')
        .select('session_id')
        .eq('user_id', options.userId);
      if (error) {
        throw new Error(`SupabaseTranscriptStore.list failed: ${error.message}`);
      }
      return (data ?? []).map((row: { session_id: string }) => row.session_id);
    },
  };
}

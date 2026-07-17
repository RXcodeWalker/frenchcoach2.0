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
  /** Caller-supplied at construction, once per authenticated request (A3/A6). */
  userId: string;
}

/**
 * assertRedistributable only reads `.contentProvenance` — SessionTranscript and
 * SpeakingTranscript share that field's type, so this narrow structural cast is
 * safe without pulling stt/ into a dependency on the full SpeakingTranscript shape.
 */
function checkRedistributable(session: SessionTranscript): void {
  assertRedistributable({ contentProvenance: session.contentProvenance } as SpeakingTranscript);
}

export function createSupabaseTranscriptStore(options: SupabaseTranscriptStoreOptions): TranscriptStore {
  const client = createClient(options.url, options.serviceKey);

  return {
    async save(t: SessionTranscript): Promise<void> {
      checkRedistributable(t);

      const { error } = await client.from('session_transcripts').upsert({
        session_id: t.sessionId,
        user_id: options.userId,
        schema_version: t.schemaVersion,
        content_provenance: t.contentProvenance,
        stt: t.stt,
        transcript: t,
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
        .single();
      if (error || !data) {
        throw new Error(`SupabaseTranscriptStore.load failed for "${sessionId}": ${error?.message}`);
      }
      return data.transcript as SessionTranscript;
    },
    async list(): Promise<string[]> {
      const { data, error } = await client.from('session_transcripts').select('session_id');
      if (error) {
        throw new Error(`SupabaseTranscriptStore.list failed: ${error.message}`);
      }
      return (data ?? []).map((row: { session_id: string }) => row.session_id);
    },
  };
}

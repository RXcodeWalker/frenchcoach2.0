/**
 * S4 impure EnvelopeStore over Supabase. Mirrors scripts/stt/supabaseTranscriptStore.ts:
 * save() calls assertRedistributable() as its first statement and throws before
 * any network call for 'confidential-internal' sessions. Table stays empty
 * through Phase A (all content is confidential-internal).
 */

import { createClient } from '@supabase/supabase-js';
import { assertRedistributable } from '../../src/domain/igcse/judgement/scoreSpeaking';
import type { SpeakingTranscript } from '../../src/domain/igcse/judgement/types';
import type { EnvelopeStore } from '../../src/domain/igcse/envelope/ports';
import { parseScoringEnvelope } from '../../src/domain/igcse/envelope/schema';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';

export interface SupabaseEnvelopeStoreOptions {
  url: string;
  serviceKey: string;
}

function checkRedistributable(envelope: ScoringEnvelope): void {
  assertRedistributable({ contentProvenance: envelope.contentProvenance } as SpeakingTranscript);
}

export function createSupabaseEnvelopeStore(options: SupabaseEnvelopeStoreOptions): EnvelopeStore {
  const client = createClient(options.url, options.serviceKey);

  return {
    async save(envelope: ScoringEnvelope): Promise<void> {
      checkRedistributable(envelope);

      const { error } = await client.from('scoring_envelopes').upsert({
        attempt_id: envelope.attemptId,
        session_id: envelope.sessionId,
        user_id: null, // caller-supplied at a higher layer once auth is wired in
        content_provenance: envelope.contentProvenance,
        envelope,
      });
      if (error) {
        throw new Error(`SupabaseEnvelopeStore.save failed: ${error.message}`);
      }
    },
    async load(attemptId: string): Promise<ScoringEnvelope> {
      const { data, error } = await client
        .from('scoring_envelopes')
        .select('envelope')
        .eq('attempt_id', attemptId)
        .single();
      if (error || !data) {
        throw new Error(`SupabaseEnvelopeStore.load failed for "${attemptId}": ${error?.message}`);
      }
      return parseScoringEnvelope(data.envelope);
    },
    async list(): Promise<string[]> {
      const { data, error } = await client.from('scoring_envelopes').select('attempt_id');
      if (error) {
        throw new Error(`SupabaseEnvelopeStore.list failed: ${error.message}`);
      }
      return (data ?? []).map((row: { attempt_id: string }) => row.attempt_id);
    },
    async listBySession(sessionId: string): Promise<ScoringEnvelope[]> {
      const { data, error } = await client
        .from('scoring_envelopes')
        .select('envelope')
        .eq('session_id', sessionId);
      if (error) {
        throw new Error(`SupabaseEnvelopeStore.listBySession failed: ${error.message}`);
      }
      return (data ?? []).map((row: { envelope: unknown }) => parseScoringEnvelope(row.envelope));
    },
  };
}

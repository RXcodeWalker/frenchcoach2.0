/**
 * S4 impure EnvelopeStore over Supabase. Mirrors scripts/stt/supabaseTranscriptStore.ts:
 * save() calls assertRedistributable() as its first statement and throws before
 * any network call for 'confidential-internal' sessions. Table stays empty
 * through Phase A (all content is confidential-internal).
 *
 * Phase B: save() is race-safe for concurrent original scoring of one session.
 * scoring_envelopes_one_original_per_session (20260717130000) is a partial
 * unique index on session_id where regraded_from is null. A plain insert lets
 * two concurrent originals both pass the caller's app-level idempotency check
 * and both attempt to write; the DB constraint is the backstop that turns the
 * loser into a 23505 instead of a second row. On that violation, save() loads
 * and returns the row that won, rather than throwing — the caller (server/
 * index.ts) treats "someone else's envelope already exists" the same as "I
 * wrote it myself".
 */

import { createClient } from '@supabase/supabase-js';
import { assertRedistributable } from '../../src/domain/igcse/judgement/scoreSpeaking';
import type { SpeakingTranscript } from '../../src/domain/igcse/judgement/types';
import type { EnvelopeStore } from '../../src/domain/igcse/envelope/ports';
import { parseScoringEnvelope } from '../../src/domain/igcse/envelope/schema';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';

/** Postgres unique_violation — see https://www.postgresql.org/docs/current/errcodes-appendix.html */
const UNIQUE_VIOLATION = '23505';

export interface SupabaseEnvelopeStoreOptions {
  url: string;
  serviceKey: string;
  /** Caller-supplied at construction, once per authenticated request (A3/A6). */
  userId: string;
}

export interface SupabaseEnvelopeStore extends EnvelopeStore {
  /**
   * B2: race-safe original-envelope write. Behaves like save() for a regrade
   * (regradedFrom set — always inserts, unlimited per session). For an
   * original (regradedFrom undefined), a concurrent writer may have already
   * won the scoring_envelopes_one_original_per_session partial unique index;
   * on that 23505, loads and returns the winning row via listBySession
   * instead of throwing. Server-only surface — CLI callers (batchScore.ts)
   * have no concurrent writers and use the shared EnvelopeStore.save().
   */
  saveOriginal(envelope: ScoringEnvelope): Promise<ScoringEnvelope>;
}

function checkRedistributable(envelope: ScoringEnvelope): void {
  assertRedistributable({ contentProvenance: envelope.contentProvenance } as SpeakingTranscript);
}

export function createSupabaseEnvelopeStore(options: SupabaseEnvelopeStoreOptions): SupabaseEnvelopeStore {
  const client = createClient(options.url, options.serviceKey);

  async function insert(envelope: ScoringEnvelope): Promise<{ code?: string; message: string } | null> {
    checkRedistributable(envelope);

    const { error } = await client.from('scoring_envelopes').insert({
      attempt_id: envelope.attemptId,
      session_id: envelope.sessionId,
      user_id: options.userId,
      content_provenance: envelope.contentProvenance,
      regraded_from: envelope.regradedFrom ?? null,
      envelope,
    });
    return error;
  }

  return {
    async save(envelope: ScoringEnvelope): Promise<void> {
      const error = await insert(envelope);
      if (error) {
        throw new Error(`SupabaseEnvelopeStore.save failed: ${error.message}`);
      }
    },
    async saveOriginal(envelope: ScoringEnvelope): Promise<ScoringEnvelope> {
      const error = await insert(envelope);
      if (!error) {
        return envelope;
      }
      if (error.code !== UNIQUE_VIOLATION) {
        throw new Error(`SupabaseEnvelopeStore.saveOriginal failed: ${error.message}`);
      }

      const { data, error: selectError } = await client
        .from('scoring_envelopes')
        .select('envelope')
        .eq('session_id', envelope.sessionId)
        .is('regraded_from', null)
        .single();
      if (selectError || !data) {
        throw new Error(
          `SupabaseEnvelopeStore.saveOriginal: lost the write race for session "${envelope.sessionId}" but could not load the winner: ${selectError?.message}`,
        );
      }
      return parseScoringEnvelope(data.envelope);
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

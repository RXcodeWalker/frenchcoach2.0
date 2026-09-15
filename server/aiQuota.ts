/**
 * Per-user daily AI-cost quota — fail-closed spend backstop.
 *
 * phase-3-plan-tidy-widget.md §2. Calls the consume_ai_quota /
 * release_ai_quota_grant RPCs (backend/supabase/migrations/
 * 20260914090000_invite_gate_and_ai_quota.sql) with the service-role key and
 * an explicit, JWT-verified userId — this service holds only the
 * service-role key (see authClient in index.ts) and never runs in a
 * per-request client-JWT context, so auth.uid() is not available to the
 * RPC, matching that migration's own comment.
 *
 * consumeAiQuotaOr503 raises on any failure (RPC error, `granted: false`)
 * rather than returning a degraded-but-still-usable value — callers must
 * not, and cannot, accidentally treat a quota-infra failure as permission
 * to call a paid provider. This is a deliberate fail-closed posture: a
 * Supabase outage must reject the request (503), never silently proceed.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class QuotaDeniedError extends Error {
  readonly statusCode: 403 | 429;
  readonly reason: string;
  readonly data: Record<string, unknown>;

  constructor(statusCode: 403 | 429, reason: string, data: Record<string, unknown>) {
    super(`ai quota denied: ${reason}`);
    this.name = 'QuotaDeniedError';
    this.statusCode = statusCode;
    this.reason = reason;
    this.data = data;
  }
}

export class QuotaServiceUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('quota_service_unavailable');
    this.name = 'QuotaServiceUnavailableError';
    if (cause !== undefined) this.cause = cause;
  }
}

interface ConsumeAiQuotaData {
  ok: boolean;
  granted: boolean;
  replayed?: boolean;
  used?: number;
  limit?: number;
  reason?: string;
}

let quotaClient: SupabaseClient | null = null;

function getQuotaClient(): SupabaseClient {
  if (!quotaClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new QuotaServiceUnavailableError(new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY not set'));
    }
    quotaClient = createClient(url, key);
  }
  return quotaClient;
}

/**
 * Consume one unit of quota for (userId, feature, idempotencyKey).
 *
 * Resolves with the RPC's data on success (granted: true). Throws
 * QuotaDeniedError(403) if the invite has not been redeemed,
 * QuotaDeniedError(429) if the daily cap is reached, or
 * QuotaServiceUnavailableError if quota state could not be consulted at all
 * — the caller must not invoke the paid provider in that case.
 */
export async function consumeAiQuotaOr503(
  userId: string,
  feature: string,
  idempotencyKey: string,
): Promise<ConsumeAiQuotaData> {
  let data: ConsumeAiQuotaData | null = null;
  try {
    const client = getQuotaClient();
    const { data: rpcData, error } = await client.rpc('consume_ai_quota', {
      p_user_id: userId,
      p_feature: feature,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    data = rpcData as ConsumeAiQuotaData;
    if (!data || typeof data.granted !== 'boolean') {
      throw new Error(`malformed consume_ai_quota response: ${JSON.stringify(rpcData)}`);
    }
  } catch (err) {
    if (err instanceof QuotaServiceUnavailableError) throw err;
    console.error(`[ai_quota] consume_ai_quota RPC failed for feature=${feature}:`, err);
    throw new QuotaServiceUnavailableError(err);
  }

  if (!data.granted) {
    const reason = data.reason ?? 'denied';
    const statusCode = reason === 'invite_not_redeemed' ? 403 : 429;
    throw new QuotaDeniedError(statusCode, reason, { ...data });
  }

  return data;
}

/**
 * Compensating delete for a grant that was consumed but whose provider call
 * then failed (not a quota-infra failure — the grant was real, the work it
 * paid for never completed). Logged on failure, never throws: a failed
 * refund must not fail the response to the caller, who already has their
 * real result or real error from the provider call.
 */
export async function releaseAiQuotaGrant(userId: string, feature: string, idempotencyKey: string): Promise<void> {
  try {
    const client = getQuotaClient();
    const { error } = await client.rpc('release_ai_quota_grant', {
      p_user_id: userId,
      p_feature: feature,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
  } catch (err) {
    console.error(`[ai_quota] release_ai_quota_grant RPC failed for feature=${feature} (user stays charged):`, err);
  }
}

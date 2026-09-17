/**
 * Age band + under-13 guardian consent (Phase 1.6 Part C). Wraps
 * set_age_band / request_guardian_consent RPCs, following the shopService
 * .rpc() error-mapping shape. grant_guardian_consent / revoke are called
 * from the guardian's own (usually anon) session — see GuardianConsent.tsx
 * — not from here, since the caller there is never "the current app user."
 *
 * sendGuardianConsentEmail() is the delivery half: it calls the FastAPI
 * backend/main.py endpoint (not a Supabase RPC — RPCs can't send email)
 * over the same authenticated-fetch pattern as adminApi.ts/scoringApiClient.ts.
 * If SMTP isn't configured server-side it 503s; callers should catch that
 * and fall back to a copy-link UI rather than claiming an email was sent.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getAccessToken } from '../../lib/authToken';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export type ConsentErrorCode =
  | 'not_authenticated'
  | 'invalid_age_band'
  | 'age_band_already_set'
  | 'age_band_not_set'
  | 'age_band_unchanged'
  | 'invalid_email'
  | 'not_under_13'
  | 'network_error'
  | 'unknown';

export class ConsentError extends Error {
  code: ConsentErrorCode;
  constructor(code: ConsentErrorCode, message: string) {
    super(message);
    this.name = 'ConsentError';
    this.code = code;
  }
}

const KNOWN_CODES: ConsentErrorCode[] = [
  'not_authenticated',
  'invalid_age_band',
  'age_band_already_set',
  'age_band_not_set',
  'age_band_unchanged',
  'invalid_email',
  'not_under_13',
];

export type GuardianActionErrorCode =
  | 'invalid_token'
  | 'relationship_required'
  | 'invalid_or_used_token'
  | 'no_active_consent'
  | 'network_error'
  | 'unknown';

export class GuardianActionError extends Error {
  code: GuardianActionErrorCode;
  constructor(code: GuardianActionErrorCode, message: string) {
    super(message);
    this.name = 'GuardianActionError';
    this.code = code;
  }
}

const GUARDIAN_KNOWN_CODES: GuardianActionErrorCode[] = [
  'invalid_token',
  'relationship_required',
  'invalid_or_used_token',
  'no_active_consent',
];

function mapGuardianRpcError(message: string): GuardianActionError {
  const found = GUARDIAN_KNOWN_CODES.find(code => message.includes(code));
  return new GuardianActionError(found ?? 'unknown', message);
}

function mapRpcError(message: string): ConsentError {
  const found = KNOWN_CODES.find(code => message.includes(code));
  return new ConsentError(found ?? 'unknown', message);
}

export async function setAgeBand(band: 'under_13' | '13_plus'): Promise<void> {
  if (!supabaseConfigured) throw new ConsentError('network_error', 'offline');
  const { error } = await supabase.rpc('set_age_band', { p_band: band });
  if (error) throw mapRpcError(error.message);
}

/**
 * "I mis-selected my age band" correction (Profile settings), distinct from
 * the one-time onboarding setAgeBand() above. -> '13_plus' takes effect
 * immediately (no re-verification). -> 'under_13' flips consent_status back
 * to 'pending' — the caller should follow up with requestGuardianConsent()
 * same as the first-time flow.
 */
export async function correctAgeBand(band: 'under_13' | '13_plus'): Promise<void> {
  if (!supabaseConfigured) throw new ConsentError('network_error', 'offline');
  const { error } = await supabase.rpc('correct_age_band', { p_band: band });
  if (error) throw mapRpcError(error.message);
}

export interface GuardianConsentRequest {
  consentId: string;
  /** Raw token — never persisted server-side. Handed to the send-email step. */
  token: string;
}

export async function requestGuardianConsent(guardianEmail: string): Promise<GuardianConsentRequest> {
  if (!supabaseConfigured) throw new ConsentError('network_error', 'offline');
  const { data, error } = await supabase.rpc('request_guardian_consent', {
    p_guardian_email: guardianEmail,
  });
  if (error) throw mapRpcError(error.message);
  const result = data as { consent_id: string; token: string };
  return { consentId: result.consent_id, token: result.token };
}

/** The link a guardian would open to confirm — used for both the emailed link and the copy-link fallback. */
export function buildGuardianConsentLink(token: string): string {
  return `${window.location.origin}/guardian-consent?token=${encodeURIComponent(token)}`;
}

/**
 * True if the email was actually sent. False (never throws for the
 * "not configured" case) means the caller should show buildGuardianConsentLink()
 * as a copy-link fallback instead.
 */
export async function sendGuardianConsentEmail(guardianEmail: string, token: string): Promise<boolean> {
  // getAccessToken, not a bare getSession(): the route is behind verify_jwt, and
  // a near-expiry token from getSession() arrives dead and 401s — which this
  // function reports as "email not sent", silently degrading a signed-in user
  // to the copy-link fallback for no reason.
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/consent/send-guardian-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ guardian_email: guardianEmail, token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Guardian-side actions (GuardianConsent.tsx) ─────────────────────────────
// Called from the guardian's own session — usually anon, never "the current
// app user" — so these are kept separate from the child-side calls above.

export async function grantGuardianConsent(token: string, relationship: string): Promise<{ childUserId: string }> {
  if (!supabaseConfigured) throw new GuardianActionError('network_error', 'offline');
  const { data, error } = await supabase.rpc('grant_guardian_consent', {
    p_token: token,
    p_relationship: relationship,
  });
  if (error) throw mapGuardianRpcError(error.message);
  const result = data as { child_user_id: string };
  return { childUserId: result.child_user_id };
}

export async function revokeGuardianConsent(childUserId: string): Promise<void> {
  if (!supabaseConfigured) throw new GuardianActionError('network_error', 'offline');
  const { error } = await supabase.rpc('revoke_guardian_consent', { p_child_user_id: childUserId });
  if (error) throw mapGuardianRpcError(error.message);
}

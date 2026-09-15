/**
 * Invite-code gate (Phase 3, phase-3-plan-tidy-widget.md §1). Wraps
 * redeem_invite_code / check_invite_code RPCs, following consentService.ts's
 * .rpc() error-mapping shape.
 *
 * This is UX only — real enforcement is server-side, inside consume_ai_quota
 * (§1c), which denies any AI-route call from a caller whose profiles.
 * invite_status isn't 'redeemed', regardless of what this screen does.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

export type InviteErrorCode = 'not_authenticated' | 'missing_code' | 'network_error' | 'unknown';

export class InviteError extends Error {
  code: InviteErrorCode;
  constructor(code: InviteErrorCode, message: string) {
    super(message);
    this.name = 'InviteError';
    this.code = code;
  }
}

const KNOWN_CODES: InviteErrorCode[] = ['not_authenticated', 'missing_code'];

function mapRpcError(message: string): InviteError {
  const found = KNOWN_CODES.find(code => message.includes(code));
  return new InviteError(found ?? 'unknown', message);
}

export interface RedeemInviteCodeResult {
  granted: boolean;
  alreadyRedeemed: boolean;
  reason?: string;
}

export async function redeemInviteCode(code: string): Promise<RedeemInviteCodeResult> {
  if (!supabaseConfigured) throw new InviteError('network_error', 'offline');
  const { data, error } = await supabase.rpc('redeem_invite_code', { p_code: code });
  if (error) throw mapRpcError(error.message);
  const result = data as { granted: boolean; already_redeemed?: boolean; reason?: string };
  return { granted: result.granted, alreadyRedeemed: result.already_redeemed ?? false, reason: result.reason };
}

export interface CheckInviteCodeResult {
  valid: boolean;
  reason?: string;
}

/** Read-only pre-check so the gate screen can show a specific reason before the real redeem call. */
export async function checkInviteCode(code: string): Promise<CheckInviteCodeResult> {
  if (!supabaseConfigured) throw new InviteError('network_error', 'offline');
  const { data, error } = await supabase.rpc('check_invite_code', { p_code: code });
  if (error) throw mapRpcError(error.message);
  const result = data as { valid: boolean; reason?: string };
  return { valid: result.valid, reason: result.reason };
}

/**
 * Username validation + claim/rename (social layer plan §3.1, §5).
 * isValidUsername is pure so it unit-tests alongside progressionService.test.ts
 * (plan §3.1). The claim/rename wrappers follow the existing sync-module
 * contract: early-return on !supabaseConfigured, never throw, console.warn +
 * a typed failure result — the DB is the actual arbiter of uniqueness and the
 * reserved-list check (plan §3.1: "client availability check is advisory,
 * the insert is the arbiter"), these wrappers just surface *why* the RPC
 * rejected the name rather than a generic failure.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export type UsernameResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_format' | 'reserved_client_side' | 'already_set' | 'throttled' | 'taken' | 'offline' | 'not_signed_in' | 'unknown' };

// Mirrors the seed list in the reserved_usernames migration, for an instant
// client-side rejection before round-tripping to the RPC. Not authoritative
// — the DB table (extendable by admins via is_admin() without a redeploy)
// is; this is purely to avoid a wasted network call for the obvious cases.
const RESERVED_CLIENT_SIDE = new Set([
  'admin', 'administrator', 'root', 'support', 'help',
  'moderator', 'mod', 'staff', 'official', 'system',
  'frenchcoach', 'null', 'undefined', 'anonymous', 'guest',
]);

function mapPostgresError(message: string): UsernameResult {
  if (message.includes('invalid_username')) return { ok: false, reason: 'invalid_format' };
  if (message.includes('username_reserved')) return { ok: false, reason: 'reserved_client_side' };
  if (message.includes('username_already_set')) return { ok: false, reason: 'already_set' };
  if (message.includes('rename_throttled')) return { ok: false, reason: 'throttled' };
  // Unique-violation on the lower(username) index — the only other expected
  // failure mode; Postgres error code 23505, but supabase-js surfaces it as
  // a message substring here rather than a structured code in all versions.
  if (message.includes('duplicate key') || message.includes('23505')) return { ok: false, reason: 'taken' };
  // Both RPCs are SECURITY INVOKER, so a missing session (or a missing GRANT
  // on profiles) surfaces as a Postgres permission error, not an auth error.
  // Distinguished from 'unknown' so the modal can say something actionable
  // instead of "try again" — retrying is exactly what won't help here.
  if (message.includes('permission denied')) return { ok: false, reason: 'not_signed_in' };
  return { ok: false, reason: 'unknown' };
}

export async function claimUsername(username: string): Promise<UsernameResult> {
  if (!isValidUsername(username)) return { ok: false, reason: 'invalid_format' };
  if (RESERVED_CLIENT_SIDE.has(username.toLowerCase())) return { ok: false, reason: 'reserved_client_side' };
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };

  try {
    const { error } = await supabase.rpc('claim_username', { new_username: username });
    if (error) {
      console.warn('[usernameService] claim failed:', error.message);
      return mapPostgresError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[usernameService] claim error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function renameUsername(username: string): Promise<UsernameResult> {
  if (!isValidUsername(username)) return { ok: false, reason: 'invalid_format' };
  if (RESERVED_CLIENT_SIDE.has(username.toLowerCase())) return { ok: false, reason: 'reserved_client_side' };
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };

  try {
    const { error } = await supabase.rpc('rename_username', { new_username: username });
    if (error) {
      console.warn('[usernameService] rename failed:', error.message);
      return mapPostgresError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[usernameService] rename error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

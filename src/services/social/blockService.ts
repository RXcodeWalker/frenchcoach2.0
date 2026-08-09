/**
 * Block / unblock / list (social layer plan §3.6, §5). block_user is an RPC
 * because it must atomically delete any friendship between the pair in the
 * same transaction (plan §3.6) — the client never writes `blocks` for a
 * block, only reads its own list and unblocks directly (a single-row delete
 * of the caller's own row, safe without a transaction).
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

export type BlockActionResult =
  | { ok: true }
  | { ok: false; reason: 'not_authenticated' | 'cannot_block_self' | 'offline' | 'unknown' };

function mapError(message: string): BlockActionResult {
  if (message.includes('not_authenticated')) return { ok: false, reason: 'not_authenticated' };
  if (message.includes('cannot_block_self')) return { ok: false, reason: 'cannot_block_self' };
  return { ok: false, reason: 'unknown' };
}

export interface BlockedUserEntry {
  userId: string;
  username: string;
  avatar?: string;
}

type BlockRow = { blocked_id: string };
type PublicProfileRow = { id: string; username: string; avatar_emoji: string | null };

export async function blockUser(targetUserId: string): Promise<BlockActionResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { error } = await supabase.rpc('block_user', { target_user_id: targetUserId });
    if (error) {
      console.warn('[blockService] block failed:', error.message);
      return mapError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[blockService] block error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function unblockUser(targetUserId: string): Promise<BlockActionResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { error } = await supabase.rpc('unblock_user', { target_user_id: targetUserId });
    if (error) {
      console.warn('[blockService] unblock failed:', error.message);
      return mapError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[blockService] unblock error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function listBlockedUsers(): Promise<BlockedUserEntry[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from('blocks').select('blocked_id');
    if (error) {
      console.warn('[blockService] list failed:', error.message);
      return [];
    }
    const rows = (data as BlockRow[]) ?? [];
    if (rows.length === 0) return [];

    const { data: profiles, error: profileError } = await supabase
      .from('public_profile')
      .select('id, username, avatar_emoji')
      .in('id', rows.map(r => r.blocked_id));

    if (profileError) {
      console.warn('[blockService] profile join failed:', profileError.message);
      return [];
    }

    return ((profiles as PublicProfileRow[]) ?? []).map(p => ({
      userId: p.id,
      username: p.username,
      avatar: p.avatar_emoji ?? undefined,
    }));
  } catch (err) {
    console.warn('[blockService] list error:', err);
    return [];
  }
}

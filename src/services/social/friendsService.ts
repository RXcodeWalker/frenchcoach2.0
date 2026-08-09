/**
 * Friends: list via friendships + public_profile (view reads), mutations via
 * RPC (social layer plan §3.3, §3.4, §5). Every mutation is a transaction on
 * the server (send_friend_request / respond_friend_request / remove_friend),
 * so the client never writes friendships directly.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

export interface FriendEntry {
  userId: string;
  username: string;
  avatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedByMe: boolean;
}

export type FriendActionResult =
  | { ok: true }
  | { ok: false; reason: 'not_authenticated' | 'cannot_friend_self' | 'already_friends' | 'request_already_pending' | 'decline_cooldown' | 'friend_request_rate_limited' | 'invalid_action' | 'offline' | 'unknown' };

function mapError(message: string): FriendActionResult {
  const known = [
    'not_authenticated', 'cannot_friend_self', 'already_friends',
    'request_already_pending', 'decline_cooldown', 'friend_request_rate_limited',
    'invalid_action',
  ] as const;
  for (const reason of known) {
    if (message.includes(reason)) return { ok: false, reason };
  }
  return { ok: false, reason: 'unknown' };
}

type FriendshipRow = {
  user_low: string;
  user_high: string;
  status: 'pending' | 'accepted' | 'declined';
  requested_by: string;
};

type PublicProfileRow = {
  id: string;
  username: string;
  avatar_emoji: string | null;
};

/** All friendships involving the caller, with the other party's public profile joined client-side. */
export async function listFriendships(userId: string): Promise<FriendEntry[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('user_low, user_high, status, requested_by')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    if (error) {
      console.warn('[friendsService] list failed:', error.message);
      return [];
    }

    const rows = (data as FriendshipRow[]) ?? [];
    if (rows.length === 0) return [];

    const otherIds = rows.map(r => (r.user_low === userId ? r.user_high : r.user_low));
    const { data: profiles, error: profileError } = await supabase
      .from('public_profile')
      .select('id, username, avatar_emoji')
      .in('id', otherIds);

    if (profileError) {
      console.warn('[friendsService] profile join failed:', profileError.message);
      return [];
    }

    const profileById = new Map((profiles as PublicProfileRow[] ?? []).map(p => [p.id, p]));

    return rows.map(r => {
      const otherId = r.user_low === userId ? r.user_high : r.user_low;
      const p = profileById.get(otherId);
      return {
        userId: otherId,
        username: p?.username ?? 'Unknown',
        avatar: p?.avatar_emoji ?? undefined,
        status: r.status,
        requestedByMe: r.requested_by === userId,
      };
    });
  } catch (err) {
    console.warn('[friendsService] list error:', err);
    return [];
  }
}

export async function sendFriendRequest(targetUserId: string): Promise<FriendActionResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { error } = await supabase.rpc('send_friend_request', { target_user_id: targetUserId });
    if (error) {
      console.warn('[friendsService] send failed:', error.message);
      return mapError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[friendsService] send error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

async function respond(targetUserId: string, action: 'accept' | 'decline' | 'cancel'): Promise<FriendActionResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { error } = await supabase.rpc('respond_friend_request', { target_user_id: targetUserId, action });
    if (error) {
      console.warn(`[friendsService] ${action} failed:`, error.message);
      return mapError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn(`[friendsService] ${action} error:`, err);
    return { ok: false, reason: 'unknown' };
  }
}

export const acceptFriendRequest = (targetUserId: string) => respond(targetUserId, 'accept');
export const declineFriendRequest = (targetUserId: string) => respond(targetUserId, 'decline');
export const cancelFriendRequest = (targetUserId: string) => respond(targetUserId, 'cancel');

export async function removeFriend(targetUserId: string): Promise<FriendActionResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { error } = await supabase.rpc('remove_friend', { target_user_id: targetUserId });
    if (error) {
      console.warn('[friendsService] remove failed:', error.message);
      return mapError(error.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[friendsService] remove error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

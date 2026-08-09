/**
 * Privacy settings — direct writes to the caller's own profiles row (plan
 * §3.5). No RPC needed: these are single-column updates on a row the
 * existing "Users can update own profile" policy already scopes to
 * auth.uid() = id, unlike friend/block mutations which need a transaction.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

export type LeaderboardVisibility = 'global' | 'friends' | 'hidden';
export type FriendRequestsFrom = 'anyone' | 'nobody';

async function updateProfileColumn(userId: string, column: string, value: unknown): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { error } = await supabase.from('profiles').update({ [column]: value }).eq('id', userId);
    if (error) {
      console.warn(`[privacyService] update ${column} failed:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[privacyService] update ${column} error:`, err);
    return false;
  }
}

export const setDiscoverable = (userId: string, value: boolean) =>
  updateProfileColumn(userId, 'discoverable', value);

export const setLeaderboardVisibility = (userId: string, value: LeaderboardVisibility) =>
  updateProfileColumn(userId, 'leaderboard_visibility', value);

export const setFriendRequestsFrom = (userId: string, value: FriendRequestsFrom) =>
  updateProfileColumn(userId, 'friend_requests_from', value);

export interface PrivacySettings {
  discoverable: boolean;
  leaderboardVisibility: LeaderboardVisibility;
  friendRequestsFrom: FriendRequestsFrom;
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  discoverable: true,
  leaderboardVisibility: 'global',
  friendRequestsFrom: 'anyone',
};

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  if (!supabaseConfigured) return DEFAULT_PRIVACY_SETTINGS;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('discoverable, leaderboard_visibility, friend_requests_from')
      .eq('id', userId)
      .single();

    if (error || !data) return DEFAULT_PRIVACY_SETTINGS;

    return {
      discoverable: (data.discoverable as boolean) ?? true,
      leaderboardVisibility: (data.leaderboard_visibility as LeaderboardVisibility) ?? 'global',
      friendRequestsFrom: (data.friend_requests_from as FriendRequestsFrom) ?? 'anyone',
    };
  } catch (err) {
    console.warn('[privacyService] get error:', err);
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

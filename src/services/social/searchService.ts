/**
 * Username prefix search (social layer plan §3.1, §3.7, §5). Prefix-only,
 * index-backed (profiles_username_prefix_idx from Phase 2), min 2 chars,
 * client-debounced 300ms by the caller — no fuzzy/trigram matching.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

export interface SearchResult {
  userId: string;
  username: string;
  avatar?: string;
}

type DiscoverableProfileRow = {
  id: string;
  username: string;
  avatar_emoji: string | null;
};

export async function searchUsernames(prefix: string): Promise<SearchResult[]> {
  if (!supabaseConfigured || prefix.length < 2) return [];
  try {
    const { data, error } = await supabase
      .from('discoverable_profiles')
      .select('id, username, avatar_emoji')
      .ilike('username', `${prefix}%`)
      .limit(20);

    if (error) {
      console.warn('[searchService] search failed:', error.message);
      return [];
    }

    return ((data as DiscoverableProfileRow[]) ?? []).map(row => ({
      userId: row.id,
      username: row.username,
      avatar: row.avatar_emoji ?? undefined,
    }));
  } catch (err) {
    console.warn('[searchService] search error:', err);
    return [];
  }
}

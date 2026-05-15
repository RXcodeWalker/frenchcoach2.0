import { supabase } from './client';
import type { UserProfile } from '../../types';

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    total_xp: data.total_xp,
    gems: data.gems ?? 0,
    current_level: data.current_level as UserProfile['current_level'],
    streak_days: data.streak_days,
    longest_streak: data.longest_streak,
    last_session_date: data.last_session_date,
    sessions_count: data.sessions_count,
    total_words_spoken: data.total_words_spoken,
    inventory: data.inventory ?? {},
    activeBoosters: data.active_boosters ?? [],
  };
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  await supabase.from('profiles').upsert({
    id: profile.id,
    username: profile.username,
    total_xp: profile.total_xp,
    current_level: profile.current_level,
    streak_days: profile.streak_days,
    longest_streak: profile.longest_streak,
    last_session_date: profile.last_session_date,
    sessions_count: profile.sessions_count,
    total_words_spoken: profile.total_words_spoken,
  });
}

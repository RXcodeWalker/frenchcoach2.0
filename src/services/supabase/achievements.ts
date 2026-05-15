import { supabase } from './client';

export async function insertAchievement(userId: string, achievementId: string, achievementName: string): Promise<void> {
  await supabase.from('achievements').insert({
    user_id: userId,
    achievement_id: achievementId,
    achievement_name: achievementName,
    achieved_at: new Date().toISOString(),
  });
}

export async function fetchUnlockedAchievementIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map(row => row.achievement_id);
}

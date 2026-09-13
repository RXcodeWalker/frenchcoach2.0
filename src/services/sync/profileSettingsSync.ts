// ── Phase 4.3 — daily_goal / notification preferences cloud mirror ──────────
// Write-only, never read back — same precedent as AppContext.tsx's
// streak_days sync-on-mount effect: the client's locally-computed/stored
// value is unconditionally authoritative, so there is no "which value wins"
// reconciliation to build. This mirror exists solely so the notification
// cron (which has no client state) can read daily_goal/notify_* server-side.

import { supabase, supabaseConfigured } from '../../lib/supabase';

export async function pushProfileSettingsToCloud(
  userId: string,
  settings: { dailyGoal: number; notifyStreak: boolean; notifyDailyGoal: boolean }
): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        daily_goal: settings.dailyGoal,
        notify_streak: settings.notifyStreak,
        notify_daily_goal: settings.notifyDailyGoal,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('[profileSettingsSync] push failed:', error.message);
    }
  } catch (err) {
    console.warn('[profileSettingsSync] push error:', err);
  }
}

// ── Phase 4.3 — local notification preference store ─────────────────────────
// "The user asked for this," distinct from Notification.permission (the live
// browser grant, read at render time, never cached here). Defaults to true so
// an unopened toggle still shows "on" once the user actually grants
// permission via requestAndSubscribe — the true "am I actually notified?"
// state is preference && Notification.permission === 'granted', computed by
// the caller (Profile.tsx), not by this module.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

interface NotificationPreferences {
  notifyStreak: boolean;
  notifyDailyGoal: boolean;
}

export function getNotifyStreakPreference(): boolean {
  return storageGet<boolean>(STORAGE_KEYS.notifyStreak, true);
}

export function setNotifyStreakPreference(value: boolean): void {
  storageSet(STORAGE_KEYS.notifyStreak, value);
}

export function getNotifyDailyGoalPreference(): boolean {
  return storageGet<boolean>(STORAGE_KEYS.notifyDailyGoal, true);
}

export function setNotifyDailyGoalPreference(value: boolean): void {
  storageSet(STORAGE_KEYS.notifyDailyGoal, value);
}

export function getNotificationPreferences(): NotificationPreferences {
  return {
    notifyStreak: getNotifyStreakPreference(),
    notifyDailyGoal: getNotifyDailyGoalPreference(),
  };
}

// ── Phase 4.3 — Web Push subscription management ────────────────────────────
// Best-effort throughout, matching progressionSync.ts's convention: never
// throws, console.warn on failure, returns success/failure so the caller
// (Profile.tsx's toggle) knows whether to persist the preference.

import { supabase, supabaseConfigured } from '../../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Standard boilerplate for converting a base64url VAPID key into the
// Uint8Array pushManager.subscribe's applicationServerKey expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Requests browser notification permission and, only on 'granted', subscribes
 * to push and upserts the subscription row. Returns whether the caller should
 * persist the "notifications on" preference — false on any denial or failure,
 * so the UI never shows "on" with nothing actually arriving.
 */
export async function requestAndSubscribe(userId: string): Promise<boolean> {
  if (!isPushSupported() || !supabaseConfigured || !VAPID_PUBLIC_KEY) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const authKey = json.keys?.auth;
    if (!endpoint || !p256dh || !authKey) return false;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh, auth_key: authKey, timezone },
      { onConflict: 'user_id,endpoint' }
    );
    if (error) {
      console.warn('[pushService] subscribe upsert failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[pushService] requestAndSubscribe error:', err);
    return false;
  }
}

/** Deletes the caller's own push subscription row(s). Does not and cannot revoke browser permission. */
export async function unsubscribe(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe().catch(() => {});
    }
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('[pushService] unsubscribe error:', err);
  }
}

import { useEffect } from 'react';

/**
 * Keeps the screen on while `active` (Screen Wake Lock API).
 *
 * Phones turn the screen off after 30 s–2 min without a touch, which hides the page and
 * stops the microphone and the speech recogniser — mid-answer, or during the exam's
 * 10-minute preparation countdown. Chrome drops the lock whenever the page is hidden, so
 * it is re-requested when the page becomes visible again.
 *
 * Best effort: unsupported browsers, battery saver and a refused request are all silent
 * no-ops — the app behaves exactly as it did before this hook existed.
 */
export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || typeof document === 'undefined') return;
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
    if (!wakeLock || typeof wakeLock.request !== 'function') return;

    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || pending || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      pending = true;
      try {
        const next = await wakeLock.request('screen');
        if (cancelled) void next.release().catch(() => undefined);
        else sentinel = next;
      } catch {
        // NotAllowedError (battery saver, not visible, permissions policy) — keep going without it.
      } finally {
        pending = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active]);
}

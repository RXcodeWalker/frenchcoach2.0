import { useSyncExternalStore } from 'react';

/**
 * `navigator.onLine`, live. "Online" only means a network interface is up —
 * a request can still fail — so callers treat `false` as certain and `true`
 * as "worth trying".
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}

import { useSyncExternalStore } from 'react';

/**
 * "Install the app" (PWA). Chrome/Edge/Android fire `beforeinstallprompt`
 * once, early — often before the Profile screen exists — so it is caught
 * here from app start (`initInstallPrompt` in main.tsx) and replayed when the
 * learner taps Install. iOS Safari has no prompt: the learner adds it from
 * the Share menu, so the row explains that instead.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  /** Already running as an installed app. */
  | 'installed'
  /** The browser offered an install prompt we can show. */
  | 'promptable'
  /** iPhone/iPad Safari: Share → Add to Home Screen. */
  | 'ios'
  /** No way to install from this browser (or not offered yet). */
  | 'unavailable';

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    notify();
  });
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function isIosSafari(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  return ios && !/crios|fxios|edgios/i.test(ua);
}

export function installState(): InstallState {
  if (installedNow || isStandalone()) return 'installed';
  if (deferred) return 'promptable';
  if (isIosSafari()) return 'ios';
  return 'unavailable';
}

/** Shows the browser's install dialog; resolves true when the learner accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // a prompt can be shown only once
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, installState, () => 'unavailable');
}

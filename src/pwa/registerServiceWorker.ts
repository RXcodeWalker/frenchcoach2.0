/**
 * When the offline cache starts filling (offline support + code splitting).
 *
 * The service worker's install downloads every screen of the app (~4 MB) so it
 * all works offline. Started at boot, that download would compete with the one
 * screen the learner is waiting for on a slow connection — so it waits until
 * the page has loaded, the first screen is up and the browser is idle, and the
 * main tabs are fetched first. It runs only inside the app (signed in or
 * guest): a visitor reading the landing page is not sent the whole app.
 *
 * A worker installed on an earlier visit controls the page from the start
 * regardless; `register` here only checks for a new version (`updateViaCache:
 * 'none'` so a deploy's worker is found straight away). Web Push waits on
 * `navigator.serviceWorker.ready`, which resolves once this has run.
 */
import { prefetchCoreScreens } from '../routing/screens';

/** Upper bound on waiting for an idle moment (a busy page still gets its offline cache). */
const IDLE_TIMEOUT_MS = 4000;

let started = false;

function pageLoaded(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
}

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
    else setTimeout(resolve, 1000);
  });
}

/** Idempotent: the first call (from the app shell, after its first render) schedules everything. */
export function startOfflineCache(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  void (async () => {
    await pageLoaded();
    await idle();
    await prefetchCoreScreens();
    if (!('serviceWorker' in navigator)) return;
    // Best-effort — no user-visible error on failure (unsupported browser, insecure context, …).
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => undefined);
  })();
}

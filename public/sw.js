// Service worker: Web Push (Phase 4.3) + an offline page for navigations.
// Hand-written, no PWA plugin. It deliberately caches nothing but offline.html:
// the app's HTML and JS bundles always come from the network, so a deploy can
// never be hidden behind a stale cached copy. A page that can't load (no
// connection) gets offline.html instead of the browser's error page — which, in
// the Android app (a Trusted Web Activity), would otherwise look like a crash.

const OFFLINE_CACHE = 'offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      // A failed precache must not stop the worker installing: push still works without it.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key)),
      );
      // Navigation preload lets the network request start while the worker boots.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only page loads. API calls, audio, scripts and images are never touched.
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(request);
      } catch (err) {
        const cache = await caches.open(OFFLINE_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;
        throw err;
      }
    })(),
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    data: { url: data.url ?? '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((c) => c.url.startsWith(self.location.origin));
      return existing ? existing.focus() : clients.openWindow(url);
    })
  );
});

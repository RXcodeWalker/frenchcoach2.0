// Phase 4.3 — Web Push service worker. Hand-written, no PWA plugin: this
// app only needs push receive + notification click, not offline caching.
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.svg',
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

// Phase 4.3 — Web Push service worker. Hand-written, no PWA plugin: this
// app only needs push receive + notification click, not offline caching.
// Retention loop (docs/systems/retention-notifications.md §3): a nudge carries
// a `tag` so a newer one replaces an unread older one, and its `url` is a deep
// link (e.g. /fix/tense_past) that a tap must actually open — also when the
// app is already open in a tab.
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url ?? '/' },
  };
  if (data.tag) options.tag = data.tag;
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (wins) => {
      const existing = wins.find((c) => c.url.startsWith(self.location.origin));
      if (!existing) return clients.openWindow(url);
      // navigate() only works on a client this worker controls; otherwise open fresh.
      try {
        const navigated = existing.url === url ? existing : await existing.navigate(url);
        return (navigated ?? existing).focus();
      } catch {
        return clients.openWindow(url);
      }
    })
  );
});

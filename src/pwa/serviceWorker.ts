/**
 * The service worker (offline support + Web Push). Bundled by esbuild into
 * `/sw.js` — at build time by `scripts/pwa/buildServiceWorker.ts` (with the
 * precache list injected) and in dev by the Vite plugin in `vite.config.ts`
 * (with an empty list, so dev never caches anything and HMR is untouched).
 *
 * What it caches is decided by `swRouting.ts`. It never caches a request that
 * reaches a server about the learner (`/api/*`, Supabase, scoring, analytics):
 * those fail offline exactly as before, and the app's own offline paths (the
 * Learn answer queue, local games) take over. A new deploy installs a new
 * precache and takes over at once; the next page load gets the new shell.
 */
import {
  classifyRequest,
  MAX_RECORDED_VOICES,
  NAVIGATION_TIMEOUT_MS,
  parseRange,
} from './swRouting';

declare const __PRECACHE_MANIFEST__: string[];
declare const __SW_VERSION__: string;

// Minimal service-worker typings: the app's tsconfig uses the DOM lib, which
// has no ServiceWorkerGlobalScope, and this file is the only one that needs it.
interface ExtendableEvent extends Event {
  waitUntil(p: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(r: Response | Promise<Response>): void;
}
interface PushEvent extends ExtendableEvent {
  data: { json(): unknown } | null;
}
interface NotificationEvent extends ExtendableEvent {
  notification: Notification & { data: { url?: string } };
}
interface SwClient {
  url: string;
  focus(): Promise<unknown>;
}
interface SwScope {
  location: Location;
  registration: ServiceWorkerRegistration;
  clients: {
    claim(): Promise<void>;
    matchAll(o: { type: string; includeUncontrolled: boolean }): Promise<SwClient[]>;
    openWindow(url: string): Promise<unknown>;
  };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', fn: (e: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', fn: (e: FetchEvent) => void): void;
  addEventListener(type: 'push', fn: (e: PushEvent) => void): void;
  addEventListener(type: 'notificationclick', fn: (e: NotificationEvent) => void): void;
}

const sw = self as unknown as SwScope;

const VERSION = __SW_VERSION__;
const PRECACHE_URLS = __PRECACHE_MANIFEST__;
/** Dev (empty list): push only, no caching at all. */
const CACHING = PRECACHE_URLS.length > 0;

const PRECACHE = `fc-precache-${VERSION}`;
const PAGES = 'fc-pages-v1';
const STATIC = 'fc-static-v1';
const FONTS = 'fc-fonts-v1';
const VOICES = 'fc-voices-v1';
const KEPT_CACHES = new Set([PRECACHE, PAGES, STATIC, FONTS, VOICES]);

// ── Lifecycle ────────────────────────────────────────────────────────────────

sw.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    if (CACHING) {
      const cache = await caches.open(PRECACHE);
      // Content-hashed assets can come from the HTTP cache (the page has usually
      // just downloaded them — no second download on a slow connection); the
      // shell, manifest and icons skip it so a stale copy never lands here.
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: url.startsWith('/assets/') ? 'default' : 'reload' })));
    }
    await sw.skipWaiting();
  })());
});

sw.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('fc-') && !KEPT_CACHES.has(n))
        .map((n) => caches.delete(n)),
    );
    await sw.clients.claim();
  })());
});

// ── Fetch ────────────────────────────────────────────────────────────────────

sw.addEventListener('fetch', (event) => {
  if (!CACHING) return;
  const { request } = event;
  const route = classifyRequest({ url: request.url, method: request.method, mode: request.mode }, sw.location.origin);
  switch (route) {
    case 'bypass':
      return;
    case 'navigation':
      event.respondWith(navigation(event));
      return;
    case 'immutable-asset':
      event.respondWith(cacheFirst(request, PRECACHE));
      return;
    case 'static-file':
      event.respondWith(staleWhileRevalidate(event, STATIC));
      return;
    case 'font-stylesheet':
      event.respondWith(staleWhileRevalidate(event, FONTS));
      return;
    case 'font-file':
      event.respondWith(cacheFirst(request, FONTS));
      return;
    case 'recorded-voice':
      event.respondWith(recordedVoice(request));
      return;
  }
});

/** The page's own path, without the query (auth links carry codes) or hash. */
function pageKey(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

function isHtml(res: Response): boolean {
  return (res.headers.get('content-type') ?? '').includes('text/html');
}

/**
 * Network first, so an online learner always gets the newest shell; after
 * NAVIGATION_TIMEOUT_MS (a crawling connection) or a failure, the cached copy
 * of this page, else the precached app shell — React Router renders the right
 * screen from the URL either way.
 */
async function navigation(event: FetchEvent): Promise<Response> {
  const { request } = event;
  const key = pageKey(request.url);
  const network = fetch(request).then(async (res) => {
    if (res.ok && isHtml(res) && res.type === 'basic') {
      const cache = await caches.open(PAGES);
      await cache.put(key, res.clone());
    }
    return res;
  });
  // Keep the refresh going after a timeout so the next load is up to date.
  event.waitUntil(network.then(() => undefined, () => undefined));

  const cachedShell = async () =>
    (await caches.match(key, { cacheName: PAGES })) ?? (await caches.match('/', { cacheName: PRECACHE }));

  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), NAVIGATION_TIMEOUT_MS));
  try {
    const first = await Promise.race([network, timeout]);
    if (first !== 'timeout') return first;
    const cached = await cachedShell();
    return cached ?? (await network);
  } catch {
    const cached = await cachedShell();
    return cached ?? offlinePage();
  }
}

function offlinePage(): Response {
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Offline</title><body style="font-family:system-ui,sans-serif;padding:32px;color:#1b1b1f;background:#f6f5f1">'
    + '<h1 style="font-size:20px">You’re offline</h1><p>Open Français AI once with a connection and it will work offline after that.</p></body>';
  return new Response(html, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') {
    const cache = await caches.open(cacheName);
    await cache.put(request, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(event: FetchEvent, cacheName: string): Promise<Response> {
  const { request } = event;
  const cached = await caches.match(request);
  const refresh = fetch(request).then(async (res) => {
    if (res.ok || res.type === 'opaque') {
      const cache = await caches.open(cacheName);
      await cache.put(request, res.clone());
    }
    return res;
  });
  if (cached) {
    event.waitUntil(refresh.then(() => undefined, () => undefined));
    return cached;
  }
  return refresh;
}

/**
 * Recorded voices are played through an <audio> element, which asks for byte
 * ranges. The file is fetched whole with CORS (the bucket is public), kept,
 * and a range request is answered with a 206 sliced from it — an opaque copy
 * could not be sliced, and Safari won't play a media response without ranges.
 */
async function recordedVoice(request: Request): Promise<Response> {
  const url = request.url;
  const cache = await caches.open(VOICES);
  let full = await cache.match(url);
  if (!full) {
    let res: Response;
    try {
      res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    } catch {
      return Response.error();
    }
    // A missing line (404) is the app's cue to fall back to the browser voice — pass it through.
    if (!res.ok) return res;
    await cache.put(url, res.clone());
    void trimCache(VOICES, MAX_RECORDED_VOICES);
    full = res;
  }
  return withRange(full, request.headers.get('range'));
}

async function withRange(full: Response, rangeHeader: string | null): Promise<Response> {
  if (!rangeHeader) return full;
  const body = await full.blob();
  const range = parseRange(rangeHeader, body.size);
  if (!range) {
    return new Response(body, { status: 200, headers: full.headers });
  }
  const slice = body.slice(range.start, range.end + 1);
  const headers = new Headers(full.headers);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${body.size}`);
  headers.set('Content-Length', String(slice.size));
  return new Response(slice, { status: 206, statusText: 'Partial Content', headers });
}

/** Drops the oldest entries (Cache keys come back in insertion order). */
async function trimCache(cacheName: string, max: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

// ── Web Push (Phase 4.3) ─────────────────────────────────────────────────────

sw.addEventListener('push', (event) => {
  const data = (event.data?.json() ?? {}) as { title?: string; body?: string; url?: string };
  event.waitUntil(sw.registration.showNotification(data.title ?? 'Français AI', {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/favicon.svg',
    data: { url: data.url ?? '/' },
  }));
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((c) => c.url.startsWith(sw.location.origin));
      return existing ? existing.focus() : sw.clients.openWindow(url);
    }),
  );
});

/**
 * Offline support — which caching strategy the service worker uses for a request.
 *
 * Pure (no service-worker globals) so it is unit-tested; `serviceWorker.ts` is
 * the only caller. The one rule that matters most: anything that talks to a
 * server about the learner (the FastAPI `/api/*` proxy, `/health`, Supabase
 * REST/auth/realtime, the scoring service, PostHog, Sentry) is `bypass` — the
 * service worker never caches or replays it. Only files that are the same for
 * everyone are cached: the app's own build output, fonts and the recorded
 * examiner/native voices (a public bucket whose paths are content hashes).
 */

export type SwRoute =
  /** Leave the request alone: the browser's normal network path. */
  | 'bypass'
  /** A page load: network first (short timeout), the cached app shell offline. */
  | 'navigation'
  /** `/assets/*` — content-hashed build output, never changes: cache first. */
  | 'immutable-asset'
  /** Other files in `public/` (icons, manifest, audio): cached, refreshed in the background. */
  | 'static-file'
  /** fonts.googleapis.com stylesheet: cached, refreshed in the background. */
  | 'font-stylesheet'
  /** fonts.gstatic.com font files: immutable, cache first. */
  | 'font-file'
  /** A recorded voice line in Supabase's public `tts-audio` bucket: cache first, capped. */
  | 'recorded-voice';

export interface SwRequestInfo {
  url: string;
  method: string;
  /** `Request.mode` — 'navigate' for a page load. */
  mode: string;
}

/** Same-origin paths that reach a server and must never be cached. */
const BYPASS_PREFIXES = ['/api/', '/health', '/sw.js', '/auth/'];

/** The public bucket the "Record voices" workflow fills (`voiceKey.ts`'s `TTS_BUCKET`). */
const RECORDED_VOICE_PATH = '/storage/v1/object/public/tts-audio/';

export function classifyRequest(req: SwRequestInfo, appOrigin: string): SwRoute {
  if (req.method !== 'GET') return 'bypass';
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return 'bypass';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'bypass';

  if (url.origin === appOrigin) {
    if (BYPASS_PREFIXES.some((p) => url.pathname === p.replace(/\/$/, '') || url.pathname.startsWith(p))) return 'bypass';
    if (req.mode === 'navigate') return 'navigation';
    if (url.pathname.startsWith('/assets/')) return url.pathname.endsWith('.map') ? 'bypass' : 'immutable-asset';
    // Vite dev-server internals (HMR client, module graph) are never cached.
    if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return 'bypass';
    // A public/ file has an extension; anything else on this origin is app data.
    return /\.[a-z0-9]{2,5}$/i.test(url.pathname) ? 'static-file' : 'bypass';
  }

  if (url.hostname === 'fonts.googleapis.com') return 'font-stylesheet';
  if (url.hostname === 'fonts.gstatic.com') return 'font-file';
  if (url.pathname.startsWith(RECORDED_VOICE_PATH) && !url.search) return 'recorded-voice';
  return 'bypass';
}

/**
 * The precache list the build injects: the app shell (`/`) and every built
 * asset except source maps (they are deleted after the Sentry upload anyway).
 */
export function selectPrecacheUrls(distFiles: readonly string[]): string[] {
  const keep = distFiles
    .map((f) => f.replace(/\\/g, '/').replace(/^\/+/, ''))
    .filter((f) => {
      if (f.endsWith('.map')) return false;
      if (f.startsWith('assets/')) return true;
      return PRECACHED_PUBLIC_FILES.includes(f);
    })
    .map((f) => `/${f}`);
  return ['/', ...[...new Set(keep)].sort()];
}

/**
 * Root files worth having offline: the favicon, the manifest and the small
 * icons (push notifications, iOS). The 512px install icons are left out —
 * the browser fetches those itself when installing, and they would add
 * ~220 KB to the first download.
 */
export const PRECACHED_PUBLIC_FILES = [
  'favicon.svg',
  'site.webmanifest',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

/** How many recorded voice lines the cache keeps (≈ 30–60 KB each). Oldest are dropped first. */
export const MAX_RECORDED_VOICES = 500;

/** How long a page load waits for the network before the cached shell is used (slow connections). */
export const NAVIGATION_TIMEOUT_MS = 3500;

/**
 * Parses a single-range `Range` header (`bytes=a-b`, `bytes=a-`, `bytes=-n`)
 * against a body of `size` bytes. Returns null for a range that can't be
 * served (multi-range, malformed or out of bounds) — the caller then answers
 * with the whole file, which every media element accepts.
 */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start: number;
  let end: number;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

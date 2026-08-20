/**
 * Render free-tier cold-start mitigation.
 *
 * The FastAPI backend sleeps after ~15 min idle and takes tens of seconds to
 * boot. Before this module, the first request that woke it was a real user
 * action (AI feedback), which then timed out and silently downgraded to the
 * offline evaluator. Warming starts at app boot instead, so by the time anyone
 * touches a backend feature the service is already up.
 *
 * Everything here is fire-and-forget: a failed ping never surfaces to the UI
 * and never rejects — the worst case is the old behaviour (cold start paid on
 * the real request).
 */

// Prod: same-origin '/health', proxied to the backend by Vercel (see
// vercel.json) — same CORS-dodging convention as apiClient.ts's API_BASE.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

/** Where the warm-up currently stands. Callers use this to decide how patient to be. */
export type WarmupPhase =
  /** No successful ping yet, attempts remain — the backend may still be booting. */
  | 'warming'
  /** The backend answered; requests should be served at normal latency. */
  | 'warm'
  /** The retry budget is spent with no answer — treat the backend as down. */
  | 'unreachable';

/**
 * Delays (ms, from the previous attempt) for the wake-up ladder. Front-loaded so
 * a merely-slow backend is confirmed quickly, then stretched to cover a full
 * Render 512MB boot (~30-60s, occasionally longer) without hammering it.
 * Total budget ≈ 2 min.
 */
const WAKE_ATTEMPT_DELAYS_MS = [0, 2000, 4000, 6000, 10000, 15000, 20000, 30000, 40000];

/** Per-ping cap. Generous: a ping that is still open is a boot in progress, which is exactly what we want. */
const PING_TIMEOUT_MS = 20000;

/** Render sleeps after ~15 min idle; ping inside that window to hold the instance open. */
const KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000;

/** After this long without a confirmed ping, a tab returning to the foreground re-warms immediately. */
const STALE_AFTER_MS = 5 * 60 * 1000;

let phase: WarmupPhase = 'warming';
let started = false;
let lastOkAt = 0;
let keepaliveTimer: ReturnType<typeof setInterval> | undefined;
/** Resolvers parked by whenBackendWarm(), released the moment the phase leaves 'warming'. */
let waiters: Array<(warm: boolean) => void> = [];

function settle(next: WarmupPhase): void {
  phase = next;
  if (next === 'warm') lastOkAt = Date.now();
  const pending = waiters;
  waiters = [];
  pending.forEach((resolve) => resolve(next === 'warm'));
}

/** One bounded GET /health. Resolves true only on a real HTTP response we can read as "the service is up". */
async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    // A 5xx from the proxy while Render boots is not "up" — keep trying. Any
    // other answered status means something is listening and awake.
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Walk the wake ladder until a ping lands or the budget is spent. */
async function runWakeLadder(): Promise<void> {
  for (const delay of WAKE_ATTEMPT_DELAYS_MS) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    if (await ping()) {
      settle('warm');
      return;
    }
  }
  settle('unreachable');
}

/**
 * Re-open the ladder after a keepalive miss or a long-backgrounded tab: the
 * instance has probably gone back to sleep, so callers should be patient again.
 */
function rewarm(): void {
  if (phase === 'warming') return; // a ladder is already running
  phase = 'warming';
  void runWakeLadder();
}

function onKeepaliveTick(): void {
  if (document.visibilityState === 'hidden') return; // don't hold a paid instance open for a tab nobody is looking at
  void ping().then((ok) => {
    if (ok) lastOkAt = Date.now();
    else rewarm();
  });
}

function onVisibilityChange(): void {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - lastOkAt > STALE_AFTER_MS) rewarm();
}

/**
 * Start warming at app boot. Idempotent — repeat calls are ignored, so this is
 * safe under React StrictMode's double-invoke.
 */
export function startBackendWarmup(): void {
  if (started) return;
  started = true;
  void runWakeLadder();
  keepaliveTimer = setInterval(onKeepaliveTick, KEEPALIVE_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibilityChange);
}

/** Tear-down for tests; production never stops warming. */
export function stopBackendWarmup(): void {
  started = false;
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  keepaliveTimer = undefined;
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

export function getWarmupPhase(): WarmupPhase {
  return phase;
}

/** True once the backend has answered a ping and has not since been seen to sleep. */
export function isBackendWarm(): boolean {
  return phase === 'warm';
}

/**
 * Resolve as soon as the warm-up settles, or after maxWaitMs — whichever is
 * first. Never rejects. Used by request paths that would rather wait a moment
 * for a booting backend than fall back to the offline evaluator.
 */
export function whenBackendWarm(maxWaitMs: number): Promise<boolean> {
  if (phase !== 'warming') return Promise.resolve(phase === 'warm');
  return new Promise((resolve) => {
    let done = false;
    const finish = (warm: boolean) => {
      if (done) return;
      done = true;
      resolve(warm);
    };
    waiters.push(finish);
    setTimeout(() => finish(isBackendWarm()), maxWaitMs);
  });
}

/** Report a successful backend call from elsewhere, so the keepalive clock tracks real traffic too. */
export function noteBackendReachable(): void {
  lastOkAt = Date.now();
  if (phase !== 'warm') settle('warm');
}

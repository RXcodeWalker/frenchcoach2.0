/**
 * S11 question-bank loader — the only place that knows the runtime store
 * exists (component-boundary rule, §7). Composes validate -> adapter for
 * whichever source it resolves: the backend's published igcse-sets endpoint,
 * or the in-repo fixture as offline/dev fallback. Mirrors the existing
 * apiClient.ts API_BASE + graceful-fallback pattern used for AI feedback.
 */

import { parseAuthoredQuestionSet } from './validate';
import { toSessionQuestionSet } from './adapter';
import { ORIGINAL_PRACTICE_001 } from './fixtures/original-practice-001';
import type { SessionQuestionSet } from '../../../domain/igcse/session/types';
import type { AuthoredQuestionSet } from './types';

// In production the browser calls same-origin '/api/*', which Vercel rewrites
// to the backend server-side (see vercel.json) — this avoids CORS entirely.
// In dev we call the backend directly (localhost / VITE_API_URL).
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

/**
 * Bounded so an unreachable/slow backend can never hang the loader — mirrors
 * apiClient.ts's fetchWithTimeout pattern. A bare `fetch` with no signal can
 * hang indefinitely on a refused/black-holed connection in some runtimes.
 */
const FETCH_TIMEOUT_MS = 2500;

/** In-repo fixtures, keyed by questionSetId — the dev/offline fallback registry. */
const OFFLINE_FIXTURES: Record<string, AuthoredQuestionSet> = {
  [ORIGINAL_PRACTICE_001.questionSetId]: ORIGINAL_PRACTICE_001,
};

async function fetchPublishedSet(questionSetId: string): Promise<AuthoredQuestionSet | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/content/igcse-sets/${encodeURIComponent(questionSetId)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    return parseAuthoredQuestionSet(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type FetchFailureKind = 'timeout' | 'network' | 'http';

interface FetchOutcome<T> {
  ok: boolean;
  value?: T;
  failure?: FetchFailureKind;
}

/** One attempt at GET-ing and JSON-parsing the catalog-listing endpoint, classifying how it failed. */
async function attemptFetchCatalog(timeoutMs: number): Promise<FetchOutcome<string[]>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/content/igcse-sets`, { signal: controller.signal });
    if (!res.ok) return { ok: false, failure: 'http' };
    const ids = (await res.json()) as unknown;
    if (!Array.isArray(ids) || ids.length === 0) return { ok: false, failure: 'http' };
    return { ok: true, value: ids as string[] };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, failure: 'timeout' };
    }
    return { ok: false, failure: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry/backoff budget for the catalog-listing call, tuned for Render free-tier
 * cold starts (~20-50s, occasionally longer for this service — see
 * docs/architecture memory on its 512MB tier). 'timeout'/'http' failures (server
 * is booting, just slow) keep retrying up to TOTAL_BUDGET_MS. 'network' failures
 * (backend genuinely unreachable — the dev/test-without-backend case) fail fast
 * after a couple of quick retries so loader.test.ts's bound still holds.
 */
const RETRY_TOTAL_BUDGET_MS = 90_000;
const RETRY_BACKOFF_MS = [1000, 2000, 4000, 6000, 8000];
const NETWORK_FAILURE_MAX_ATTEMPTS = 2;

async function fetchCatalogWithRetry(): Promise<{ ids: string[]; source: 'remote' | 'fixture' }> {
  const startedAt = Date.now();
  let attempt = 0;
  let networkFailures = 0;

  while (true) {
    const outcome = await attemptFetchCatalog(FETCH_TIMEOUT_MS);
    if (outcome.ok && outcome.value) {
      return { ids: outcome.value, source: 'remote' };
    }

    if (outcome.failure === 'network') {
      networkFailures += 1;
      if (networkFailures >= NETWORK_FAILURE_MAX_ATTEMPTS) {
        return { ids: Object.keys(OFFLINE_FIXTURES), source: 'fixture' };
      }
    }

    const elapsed = Date.now() - startedAt;
    const backoff = RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)];
    if (elapsed + backoff >= RETRY_TOTAL_BUDGET_MS) {
      return { ids: Object.keys(OFFLINE_FIXTURES), source: 'fixture' };
    }

    await new Promise((resolve) => setTimeout(resolve, backoff));
    attempt += 1;
  }
}

/**
 * Resolves one question set by id: backend (published) first, falling back
 * to the in-repo offline fixture. Always returns the validated + adapted
 * engine-facing SessionQuestionSet — the only shape the conduct engine
 * consumes — never the AuthoredQuestionSet directly.
 */
export async function getOriginalQuestionSet(questionSetId: string): Promise<SessionQuestionSet | undefined> {
  const remote = await fetchPublishedSet(questionSetId);
  if (remote) return toSessionQuestionSet(remote);

  const fixture = OFFLINE_FIXTURES[questionSetId];
  if (!fixture) return undefined;
  const validated = parseAuthoredQuestionSet(fixture);
  return toSessionQuestionSet(validated);
}

/**
 * Lists published question-set ids: backend-first (GET /api/content/igcse-sets),
 * falling back to the in-repo offline fixture registry's keys. Usability-only
 * (S11 §8) — no adaptive/weighted/history-aware selection.
 */
export async function listPublishedQuestionSetIds(): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/content/igcse-sets`, { signal: controller.signal });
    if (!res.ok) return Object.keys(OFFLINE_FIXTURES);
    const ids = (await res.json()) as unknown;
    if (!Array.isArray(ids) || ids.length === 0) return Object.keys(OFFLINE_FIXTURES);
    return ids as string[];
  } catch {
    return Object.keys(OFFLINE_FIXTURES);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Synchronous, offline-only accessor for the raw AuthoredQuestionSets bundled in
 * the repo — used by exam-selection UI to render a usable card *immediately* on
 * mount, before the (potentially cold-starting) backend catalog resolves. Never
 * touches the network.
 */
export function getOfflineAuthoredSets(): AuthoredQuestionSet[] {
  return Object.values(OFFLINE_FIXTURES).map((s) => parseAuthoredQuestionSet(s));
}

/** Synchronous, offline-only accessor for callers that can't await (dev/test convenience). */
export function getOfflineQuestionSet(questionSetId: string): SessionQuestionSet | undefined {
  const fixture = OFFLINE_FIXTURES[questionSetId];
  if (!fixture) return undefined;
  const validated = parseAuthoredQuestionSet(fixture);
  return toSessionQuestionSet(validated);
}

/**
 * Fetches one published set's raw AuthoredQuestionSet (pre-adaptation) —
 * used by exam-selection UI that needs title/subTopic metadata, never by
 * the conduct engine. Backend-first, falling back to the offline fixture.
 */
export async function getAuthoredQuestionSet(questionSetId: string): Promise<AuthoredQuestionSet | undefined> {
  const remote = await fetchPublishedSet(questionSetId);
  if (remote) return remote;

  const fixture = OFFLINE_FIXTURES[questionSetId];
  if (!fixture) return undefined;
  return parseAuthoredQuestionSet(fixture);
}

/**
 * Lists every published set's raw AuthoredQuestionSet, for exam-selection UI.
 * Usability-only (S11 §8) — no adaptive/weighted/history-aware selection.
 */
export async function listPublishedQuestionSets(): Promise<AuthoredQuestionSet[]> {
  const ids = await listPublishedQuestionSetIds();
  const sets = await Promise.all(ids.map(getAuthoredQuestionSet));
  return sets.filter((s): s is AuthoredQuestionSet => s !== undefined);
}

/**
 * Retry-aware catalog listing for exam-selection UI: rides out a Render
 * cold start on the catalog-listing call (bounded backoff loop, see
 * fetchCatalogWithRetry) instead of collapsing to the 1-exam offline fixture
 * after a single 2.5s timeout. The `source` tag lets the caller distinguish
 * "real catalog" from "offline fixture" so the fallback can be labeled
 * instead of silently presented as the full set.
 */
export async function listPublishedQuestionSetsWithRetry(): Promise<{
  sets: AuthoredQuestionSet[];
  source: 'remote' | 'fixture';
}> {
  const { ids, source } = await fetchCatalogWithRetry();
  if (source === 'fixture') {
    const sets = ids
      .map((id) => OFFLINE_FIXTURES[id])
      .filter((s): s is AuthoredQuestionSet => s !== undefined)
      .map((s) => parseAuthoredQuestionSet(s));
    return { sets, source };
  }
  const sets = await Promise.all(ids.map(getAuthoredQuestionSet));
  return { sets: sets.filter((s): s is AuthoredQuestionSet => s !== undefined), source };
}

/**
 * Retry-aware id listing — same backoff budget as listPublishedQuestionSetsWithRetry,
 * for callers (ExamMode's "Surprise Me" path) that only need ids, not full sets.
 */
export async function listPublishedQuestionSetIdsWithRetry(): Promise<string[]> {
  const { ids } = await fetchCatalogWithRetry();
  return ids;
}

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

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

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
async function getAuthoredQuestionSet(questionSetId: string): Promise<AuthoredQuestionSet | undefined> {
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

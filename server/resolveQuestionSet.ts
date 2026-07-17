/**
 * A5 — Node-safe question-set resolution for the scoring service.
 *
 * Mirrors src/data/exam/bank/loader.ts (backend-published set, falling back
 * to the in-repo fixture) but must not import that file: loader.ts reads
 * import.meta.env.VITE_API_URL at module scope, which is Vite-only and
 * throws under plain Node/esbuild. This resolves the same two sources via
 * process.env instead, then hash-guards the result against the transcript's
 * declared questionSetHash (A5) — the only thing standing between a session
 * scored against the fixture and one scored against the published set.
 */

import { parseAuthoredQuestionSet } from '../src/data/exam/bank/validate';
import { toSessionQuestionSet } from '../src/data/exam/bank/adapter';
import { ORIGINAL_PRACTICE_001 } from '../src/data/exam/bank/fixtures/original-practice-001';
import { hashQuestionSet } from '../src/domain/igcse/content/hashQuestionSet';
import type { SessionQuestionSet } from '../src/domain/igcse/session/types';
import type { AuthoredQuestionSet } from '../src/data/exam/bank/types';

const API_BASE = process.env.VITE_API_URL ?? 'http://localhost:8000';
const FETCH_TIMEOUT_MS = 2500;

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

export class QuestionSetNotFoundError extends Error {
  constructor(questionSetId: string) {
    super(`No published or fixture question set for id "${questionSetId}"`);
    this.name = 'QuestionSetNotFoundError';
  }
}

export class QuestionSetHashMismatchError extends Error {
  constructor(questionSetId: string) {
    super(`Resolved question set "${questionSetId}" hash does not match the transcript's declared questionSetHash`);
    this.name = 'QuestionSetHashMismatchError';
  }
}

/** Resolves one question set by id: backend (published) first, in-repo fixture fallback. */
export async function resolveQuestionSet(questionSetId: string): Promise<SessionQuestionSet> {
  const remote = await fetchPublishedSet(questionSetId);
  if (remote) return toSessionQuestionSet(remote);

  const fixture = OFFLINE_FIXTURES[questionSetId];
  if (!fixture) throw new QuestionSetNotFoundError(questionSetId);
  const validated = parseAuthoredQuestionSet(fixture);
  return toSessionQuestionSet(validated);
}

/**
 * Resolves the question set and asserts its hash matches the transcript's
 * declared questionSetHash. Throws QuestionSetHashMismatchError, never
 * silently substitutes — a session must be scored against the exact
 * question wording it was actually conducted against (A5).
 */
export async function resolveAndVerifyQuestionSet(
  questionSetId: string,
  expectedHash: string,
): Promise<SessionQuestionSet> {
  const resolved = await resolveQuestionSet(questionSetId);
  const actualHash = await hashQuestionSet(resolved);
  if (actualHash !== expectedHash) {
    throw new QuestionSetHashMismatchError(questionSetId);
  }
  return resolved;
}

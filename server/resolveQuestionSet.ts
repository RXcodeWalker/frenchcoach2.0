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
 *
 * The offline registry is the same 10-set OFFLINE_FIXTURES the browser loader
 * uses (src/data/exam/bank/fixtures/index.ts). It used to hold only set 001,
 * so wherever the content API was unreachable or rate-limited (or
 * VITE_API_URL unset), sets 002–010 got a terminal 400.
 */

import { parseAuthoredQuestionSet } from '../src/data/exam/bank/validate';
import { toSessionQuestionSet } from '../src/data/exam/bank/adapter';
import { OFFLINE_FIXTURES } from '../src/data/exam/bank/fixtures';
import { hashQuestionSet } from '../src/domain/igcse/content/hashQuestionSet';
import type { SessionQuestionSet } from '../src/domain/igcse/session/types';
import type { AuthoredQuestionSet } from '../src/data/exam/bank/types';

const API_BASE = process.env.VITE_API_URL ?? 'http://localhost:8000';
const FETCH_TIMEOUT_MS = 2500;

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

/**
 * Both sources for this id, remote first, whichever exist. A mid-deploy
 * window can have the remote and the in-repo fixture carrying different
 * content revisions (0520 conduct plan, Batch 6) — resolveAndVerifyQuestionSet
 * needs both candidates to hash-match against, not just the first one found.
 */
async function resolveCandidates(questionSetId: string): Promise<SessionQuestionSet[]> {
  const candidates: SessionQuestionSet[] = [];

  const remote = await fetchPublishedSet(questionSetId);
  if (remote) candidates.push(toSessionQuestionSet(remote));

  const fixture = OFFLINE_FIXTURES[questionSetId];
  if (fixture) candidates.push(toSessionQuestionSet(parseAuthoredQuestionSet(fixture)));

  if (candidates.length === 0) throw new QuestionSetNotFoundError(questionSetId);
  return candidates;
}

/** Resolves one question set by id: backend (published) first, in-repo fixture fallback. */
export async function resolveQuestionSet(questionSetId: string): Promise<SessionQuestionSet> {
  const [first] = await resolveCandidates(questionSetId);
  return first;
}

/**
 * Resolves the question set and asserts its hash matches the transcript's
 * declared questionSetHash. Never silently substitutes — a session must be
 * scored against the exact question wording it was actually conducted
 * against (A5) — but during a mid-deploy window the remote and the in-repo
 * fixture can carry different content revisions, and a session run against
 * either one is equally legitimate: SHA-256 equality *is* proof the candidate
 * ran against this exact content (0520 conduct plan, Batch 6). So every
 * resolved candidate is hash-checked in turn, and the first match wins;
 * only when NEITHER matches does this throw QuestionSetHashMismatchError.
 */
export async function resolveAndVerifyQuestionSet(
  questionSetId: string,
  expectedHash: string,
): Promise<SessionQuestionSet> {
  const candidates = await resolveCandidates(questionSetId);
  for (const candidate of candidates) {
    const actualHash = await hashQuestionSet(candidate);
    if (actualHash === expectedHash) return candidate;
  }
  throw new QuestionSetHashMismatchError(questionSetId);
}

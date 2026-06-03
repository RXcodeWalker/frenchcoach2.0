import type { CEFRLevel, QuestionV2, SkillType } from '../../types/questions';
import { QUESTIONS, EXAM_SETS } from '../../data/questions';
import { inferQuestionMetadata } from './questionMetadata';
import { STORAGE_KEYS, storageRemove } from '../persistence/storage';

// ── Local pool ────────────────────────────────────────────────────────────────
// All 444 existing questions enriched with inferred metadata.
// Initialised once on first access; stable for the lifetime of the page.

let _localPool: QuestionV2[] | null = null;

export function getLocalPool(): QuestionV2[] {
  if (!_localPool) {
    _localPool = QUESTIONS.map(inferQuestionMetadata);
  }
  return _localPool;
}

// ── LocalStorage cache (populated by Supabase in Phase 2) ────────────────────

const CACHE_KEY = STORAGE_KEYS.contentCache;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry {
  questions: QuestionV2[];
  fetchedAt: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

export function writeCache(questions: QuestionV2[]): void {
  try {
    const entry: CacheEntry = { questions, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded — silent; local pool is the fallback
  }
}

export function invalidateCache(): void {
  storageRemove(CACHE_KEY);
}

// ── Supabase availability ─────────────────────────────────────────────────────
// Phase 1: always returns false (Supabase not yet wired).
// Phase 2: updated to perform a real reachability check.

export async function isSupabaseAvailable(): Promise<boolean> {
  return false;
}

// ── Query parameters ──────────────────────────────────────────────────────────

export interface QueryParams {
  topicKey?: string;
  level?: CEFRLevel;            // supportedLevels must include this value
  cefrLevels?: CEFRLevel[];     // supportedLevels must include at least one of these
  skill?: SkillType;
  examTag?: string;
  validationStates?: string[];
  includeAIGenerated?: boolean; // default true; false excludes source='ai_generated'
}

// ── Local filter ──────────────────────────────────────────────────────────────

function applyLocalFilter(pool: QuestionV2[], params: QueryParams): QuestionV2[] {
  return pool.filter(q => {
    if (params.topicKey && q.topicKey !== params.topicKey) return false;
    if (params.level && !q.supportedLevels.includes(params.level)) return false;
    if (params.cefrLevels?.length && !params.cefrLevels.some(l => q.supportedLevels.includes(l))) return false;
    if (params.skill && q.skill !== params.skill) return false;
    if (params.examTag && !q.examTags.includes(params.examTag)) return false;
    if (params.includeAIGenerated === false && q.source === 'ai_generated') return false;
    if (params.validationStates?.length && !params.validationStates.includes(q.validationState)) return false;
    return true;
  });
}

// ── Primary query API ─────────────────────────────────────────────────────────
// Phase 1: routes to cache (if warm) → local pool.
// Phase 2: Supabase-first, falling back through cache → local pool.

export async function queryQuestions(params: QueryParams): Promise<QuestionV2[]> {
  if (await isSupabaseAvailable()) {
    // Phase 2 will replace this stub with a real Supabase fetch.
    // Kept as a no-op branch so Phase 2 only needs to fill this path.
  }

  const cache = readCache();
  const pool = cache?.questions ?? getLocalPool();
  return applyLocalFilter(pool, params);
}

// ── Exam set helpers ──────────────────────────────────────────────────────────

export async function getExamSet(id: string): Promise<{ question_ids: string[] }> {
  // Phase 2 will check Supabase first.
  const set = EXAM_SETS.find(s => s.id === id);
  return { question_ids: set?.questions ?? [] };
}

export async function getQuestionsByIds(ids: string[]): Promise<QuestionV2[]> {
  // Phase 2 will query Supabase first.
  return getLocalPool().filter(q => ids.includes(q.id));
}

// ── Convenience: single entry point for session builders ─────────────────────

export const contentClient = {
  queryQuestions,
  getExamSet,
  getQuestionsByIds,
  getLocalPool,
  isSupabaseAvailable,
  invalidateCache,
  writeCache,
} as const;

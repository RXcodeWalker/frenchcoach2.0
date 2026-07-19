import type { Question, OfflineScenario } from '../../types';
import { QUESTIONS } from '../../data/questions';
import { OFFLINE_SCENARIOS } from '../../data/scenarios/offlineScenarios';

// Public content reads with offline fallback. The backend serves only
// status='published' rows from Supabase; the local TypeScript bundles are the
// implicitly-published fallback when the API is unreachable.

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json)
// to avoid CORS. Dev: call the backend directly.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

// ── snake_case (DB) → camelCase (app types) mappers ──────────────────────────
interface QuestionRow {
  id: string;
  topic_key: string;
  text: string;
  hint: string;
  difficulty: 1 | 2 | 3;
  follow_ups: string[];
  model_answer: string;
  key_vocab: { fr: string; en: string }[];
  is_past_paper?: boolean;
  year?: number | null;
  paper_code?: string | null;
}

function rowToQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    topicKey: r.topic_key,
    text: r.text,
    hint: r.hint ?? '',
    difficulty: r.difficulty,
    followUps: r.follow_ups ?? [],
    modelAnswer: r.model_answer ?? '',
    keyVocab: r.key_vocab ?? [],
    isPastPaper: r.is_past_paper ?? false,
    year: r.year ?? undefined,
    paperCode: r.paper_code ?? undefined,
  };
}

interface ScenarioRow {
  id: string;
  emoji: string;
  title: string;
  description: string;
  turns: number;
  data: OfflineScenario['data'];
}

function rowToScenario(r: ScenarioRow): OfflineScenario {
  return {
    id: r.id,
    emoji: r.emoji,
    title: r.title,
    description: r.description,
    turns: r.turns,
    data: r.data,
  };
}

// ── Public fetchers ──────────────────────────────────────────────────────────
export async function fetchQuestions(): Promise<Question[]> {
  try {
    const res = await fetch(`${API_BASE}/api/content/questions`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows: QuestionRow[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty');
    return rows.map(rowToQuestion);
  } catch {
    return QUESTIONS; // offline fallback — unchanged TypeScript bundle
  }
}

export async function fetchScenarios(): Promise<OfflineScenario[]> {
  try {
    const res = await fetch(`${API_BASE}/api/content/scenarios`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows: ScenarioRow[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty');
    return rows.map(rowToScenario);
  } catch {
    return OFFLINE_SCENARIOS; // offline fallback
  }
}

export const contentService = { fetchQuestions, fetchScenarios } as const;

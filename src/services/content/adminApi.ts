import { supabase } from '../../lib/supabase';
import type { ContentStatus, QuestionInput, ScenarioInput } from '../../schemas/content';

// Authenticated admin CRUD client. Every call attaches the current Supabase
// access token; the backend gates on JWT app_metadata.role === 'admin'.

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export class ConflictError extends Error {
  constructor(public serverMessage: string) {
    super(serverMessage);
    this.name = 'ConflictError';
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: await authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 409) {
    let msg = 'This record was modified by another editor. Reload and retry.';
    try {
      const detail = (await res.json()).detail;
      if (detail?.message) msg = detail.message;
    } catch { /* keep default */ }
    throw new ConflictError(msg);
  }
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const j = await res.json();
      detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j);
    } catch { /* keep status */ }
    throw new Error(`Admin API ${method} ${path} → ${detail}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// ── Reads (via authenticated Supabase client — RLS lets admins see all) ──────
export interface QuestionRecord extends QuestionInput {
  updated_at: string;
  created_at?: string;
}
export interface ScenarioRecord extends ScenarioInput {
  updated_at: string;
  created_at?: string;
}

export async function listQuestions(status?: ContentStatus): Promise<QuestionRecord[]> {
  let q = supabase.from('questions').select('*').order('id');
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as QuestionRecord[];
}

export async function getQuestion(id: string): Promise<QuestionRecord> {
  const { data, error } = await supabase.from('questions').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as QuestionRecord;
}

export async function listScenarios(status?: ContentStatus): Promise<ScenarioRecord[]> {
  let q = supabase.from('scenarios').select('*').order('id');
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ScenarioRecord[];
}

export async function getScenario(id: string): Promise<ScenarioRecord> {
  const { data, error } = await supabase.from('scenarios').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as ScenarioRecord;
}

// ── Counts for the dashboard ─────────────────────────────────────────────────
export interface StatusCounts {
  draft: number;
  published: number;
  archived: number;
}

async function countByStatus(table: 'questions' | 'scenarios'): Promise<StatusCounts> {
  const statuses: ContentStatus[] = ['draft', 'published', 'archived'];
  const counts: StatusCounts = { draft: 0, published: 0, archived: 0 };
  await Promise.all(
    statuses.map(async s => {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('status', s);
      counts[s] = count ?? 0;
    }),
  );
  return counts;
}

export const getQuestionCounts = () => countByStatus('questions');
export const getScenarioCounts = () => countByStatus('scenarios');

// ── Writes (via backend — versioning, locking, validation) ──────────────────
export const createQuestion = (body: QuestionInput) =>
  request<QuestionRecord>('POST', '/api/admin/questions', body);

export const updateQuestion = (id: string, body: Partial<QuestionInput> & { expected_updated_at?: string }) =>
  request<QuestionRecord>('PUT', `/api/admin/questions/${id}`, body);

export const archiveQuestion = (id: string) =>
  request<{ id: string; status: string }>('DELETE', `/api/admin/questions/${id}`);

export const createScenario = (body: ScenarioInput) =>
  request<ScenarioRecord>('POST', '/api/admin/scenarios', body);

export const updateScenario = (id: string, body: Partial<ScenarioInput> & { expected_updated_at?: string }) =>
  request<ScenarioRecord>('PUT', `/api/admin/scenarios/${id}`, body);

export const archiveScenario = (id: string) =>
  request<{ id: string; status: string }>('DELETE', `/api/admin/scenarios/${id}`);

// ── Bulk ──────────────────────────────────────────────────────────────────────
export interface BulkRequest {
  ids: string[];
  action: 'publish' | 'archive' | 'draft' | 'reassign_topic' | 'set_difficulty';
  topic_key?: string;
  difficulty?: 1 | 2 | 3;
}
export interface BulkResult { updated: number; skipped: number; errors: string[] }

export const bulkQuestions = (body: BulkRequest) =>
  request<BulkResult>('POST', '/api/admin/questions/bulk', body);
export const bulkScenarios = (body: BulkRequest) =>
  request<BulkResult>('POST', '/api/admin/scenarios/bulk', body);

// ── Versioning ──────────────────────────────────────────────────────────────
export interface VersionMeta { version_number: number; created_by: string | null; created_at: string }
export interface DiffEntry { field: string; from: unknown; to: unknown }
export interface VersionPreview {
  id: string;
  version: number;
  current: Record<string, unknown>;
  target: Record<string, unknown>;
  diff: DiffEntry[];
}

type Kind = 'questions' | 'scenarios';

export const listVersions = (kind: Kind, id: string) =>
  request<{ id: string; versions: VersionMeta[] }>('GET', `/api/admin/${kind}/${id}/versions`);

export const previewVersion = (kind: Kind, id: string, v: number) =>
  request<VersionPreview>('GET', `/api/admin/${kind}/${id}/versions/${v}/preview`);

export const restoreVersion = (kind: Kind, id: string, v: number, expected_updated_at?: string) =>
  request<Record<string, unknown>>('POST', `/api/admin/${kind}/${id}/restore/${v}`, { expected_updated_at });

// ── References ──────────────────────────────────────────────────────────────
export interface Reference { type: string; id: string; label: string }

export const getReferences = (kind: Kind, id: string) =>
  request<{ id: string; references: Reference[] }>('GET', `/api/admin/${kind}/${id}/references`);

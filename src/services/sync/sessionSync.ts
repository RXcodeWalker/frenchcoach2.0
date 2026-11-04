import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { MAX_STORED_SESSIONS, type StoredSession } from '../analytics/analyticsService';
import type { ExamAreaMarks, Session } from '../../types';
import { captureError } from '../telemetry/telemetryService';
import { localDayBefore, localDayOf } from '../../lib/localDay';

// ── Types ──────────────────────────────────────────────────────────────────────

type CloudSessionRow = {
  id: string;
  user_id: string;
  mode: string;
  topic_key: string | null;
  question_text: string | null;
  transcript: string | null;
  word_count: number;
  score: number | null;
  xp_earned: number;
  duration_sec: number;
  feedback: Record<string, unknown> | null;
  created_at: string;
  // Exam-attempt columns (added to production by backend migration
  // 20261103090000_teacher_dashboard; recorded on backend main by
  // 20261103140000_sessions_exam_fields). Optional: a row sends them only when
  // set, and a database without them still syncs (see upsertSessionRow).
  practice_only?: boolean | null;
  exam_marks?: Record<string, number> | null;
  scoring_session_id?: string | null;
};

type FeedbackSummaryBlob = {
  schemaVersion?: number;
  scores?: { overall: number | null; communication?: number; language?: number; accuracy?: number; fluency?: number };
  unscored?: string;
  cefrLevel?: string;
  biggest_opportunity?: string;
  examiner_oneLiner?: string;
  best_moment?: string;
  critical_count?: number;
  /** learn-marking §8.3 — 'ladder-v1' on a ladder-scored attempt; absent on v6, so history stays comparable. */
  markingVersion?: string;
};

// One shape for a stored session, shared with analyticsService (it used to be
// copied here and drifted: this copy lacked practiceOnly/examMarks, so a
// restored session silently lost them).
export type { StoredSession };

interface AnalyticsData {
  sessions: StoredSession[];
  totalWords: number;
  streak: {
    count: number;
    lastDate: string | null;
    brokenAt?: { previousCount: number; brokenDate: string } | null;
  };
  challengeLog: Record<string, boolean>;
}

const BASE_COLUMNS = 'id, user_id, mode, topic_key, question_text, transcript, word_count, score, xp_earned, duration_sec, feedback, created_at';
const EXAM_COLUMNS = ['practice_only', 'exam_marks', 'scoring_session_id'] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSyncedIds(): Set<string> {
  return new Set(storageGet<string[]>(STORAGE_KEYS.syncedSessionIds, []));
}

function addSyncedId(id: string): void {
  const ids = storageGet<string[]>(STORAGE_KEYS.syncedSessionIds, []);
  if (!ids.includes(id)) {
    storageSet(STORAGE_KEYS.syncedSessionIds, [...ids, id]);
  }
}

function getPendingIds(): string[] {
  return storageGet<string[]>(STORAGE_KEYS.pendingSyncSessionIds, []);
}

function addPendingId(id: string): void {
  const ids = getPendingIds();
  if (!ids.includes(id)) {
    storageSet(STORAGE_KEYS.pendingSyncSessionIds, [...ids, id]);
  }
}

function removePendingId(id: string): void {
  const ids = getPendingIds().filter(x => x !== id);
  storageSet(STORAGE_KEYS.pendingSyncSessionIds, ids);
}

function loadAnalyticsData(): AnalyticsData {
  return storageGet<AnalyticsData>(STORAGE_KEYS.analytics, {
    sessions: [],
    totalWords: 0,
    streak: { count: 0, lastDate: null },
    challengeLog: {},
  });
}

// ── stripFeedback ──────────────────────────────────────────────────────────────

function stripFeedback(feedback: unknown): FeedbackSummaryBlob | null {
  if (!feedback || typeof feedback !== 'object') return null;
  const f = feedback as Record<string, unknown>;
  const blob: FeedbackSummaryBlob = {};

  if (typeof f.schemaVersion === 'number') blob.schemaVersion = f.schemaVersion;
  if (typeof f.unscored === 'string') blob.unscored = f.unscored;

  const scores = f.scores as Record<string, unknown> | undefined;
  if (scores && typeof scores === 'object') {
    blob.scores = {
      overall: typeof scores.overall === 'number' ? scores.overall : null,
      communication: scores.communication as number | undefined,
      language: scores.language as number | undefined,
      accuracy: scores.accuracy as number | undefined,
      fluency: scores.fluency as number | undefined,
    };
  }

  if (typeof f.cefrLevel === 'string') blob.cefrLevel = f.cefrLevel;
  if (typeof f.markingVersion === 'string') blob.markingVersion = f.markingVersion;
  if (typeof f.biggest_opportunity === 'string') blob.biggest_opportunity = f.biggest_opportunity;
  if (typeof f.best_moment === 'string') blob.best_moment = f.best_moment;

  const examiner = f.examiner as Record<string, unknown> | undefined;
  if (examiner && typeof examiner.oneLiner === 'string') {
    blob.examiner_oneLiner = examiner.oneLiner;
  }

  const grammar = f.grammar as Record<string, unknown> | undefined;
  if (grammar && Array.isArray(grammar.critical)) {
    blob.critical_count = grammar.critical.length;
  }

  return blob;
}

// ── Session ↔ CloudSessionRow mapping ─────────────────────────────────────────

type ExamFields = Pick<StoredSession, 'practiceOnly' | 'examMarks' | 'scoringSessionId'>;

/** The exam columns for a row — only the ones that are set, so a Learn answer's row carries none of them. */
function examColumns(s: ExamFields): Partial<Pick<CloudSessionRow, typeof EXAM_COLUMNS[number]>> {
  return {
    ...(typeof s.practiceOnly === 'boolean' ? { practice_only: s.practiceOnly } : {}),
    ...(s.examMarks ? { exam_marks: { ...s.examMarks } } : {}),
    ...(s.scoringSessionId ? { scoring_session_id: s.scoringSessionId } : {}),
  };
}

function sessionToRow(userId: string, session: Session): CloudSessionRow {
  return {
    id: session.id,
    user_id: userId,
    mode: session.mode,
    topic_key: session.topicKey ?? null,
    question_text: (session.questionText ?? '').slice(0, 500),
    transcript: (session.transcript ?? '').slice(0, 2000),
    word_count: session.wordCount,
    score: session.score,
    xp_earned: session.xpEarned,
    duration_sec: session.durationSec,
    feedback: stripFeedback(session.feedback) as Record<string, unknown> | null,
    created_at: session.createdAt,
    ...examColumns(session),
  };
}

/** The row for a session that only exists as its stored summary (backfill, the offline queue). */
function storedToRow(userId: string, stored: StoredSession): CloudSessionRow {
  const hasSummary = stored.feedbackSummary !== undefined || stored.cefrLevel !== undefined || stored.criticalIssueCount !== undefined;
  return {
    id: stored.id,
    user_id: userId,
    mode: stored.mode,
    topic_key: stored.topicKey,
    question_text: (stored.questionText ?? '').slice(0, 500),
    transcript: (stored.transcript ?? '').slice(0, 2000),
    word_count: stored.wordCount,
    score: stored.score,
    xp_earned: stored.xpEarned ?? 0,
    duration_sec: stored.durationSec,
    feedback: hasSummary
      ? { biggest_opportunity: stored.feedbackSummary, cefrLevel: stored.cefrLevel, critical_count: stored.criticalIssueCount }
      : null,
    created_at: stored.date,
    ...examColumns(stored),
  };
}

function mentionsExamColumn(message: string | undefined): boolean {
  return !!message && EXAM_COLUMNS.some(c => message.includes(c));
}

/**
 * Upsert one row. If the database lacks the exam columns (PostgREST: "Could not
 * find the 'practice_only' column"), the row is sent again without them, so
 * sessions never stop syncing against an older schema.
 */
async function upsertSessionRow(row: CloudSessionRow): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'id' });
  if (!error) return { error: null };
  if (!mentionsExamColumn(error.message)) return { error };
  const legacy: Record<string, unknown> = { ...row };
  for (const c of EXAM_COLUMNS) delete legacy[c];
  const retry = await supabase.from('sessions').upsert(legacy, { onConflict: 'id' });
  return { error: retry.error };
}

function parseExamMarks(value: unknown): ExamAreaMarks | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const keys = ['rolePlay', 'rolePlayMax', 'communication', 'qualityOfLanguage', 'total'] as const;
  if (!keys.every(k => typeof v[k] === 'number' && Number.isFinite(v[k]))) return undefined;
  return {
    rolePlay: v.rolePlay as number,
    rolePlayMax: v.rolePlayMax as number,
    communication: v.communication as number,
    qualityOfLanguage: v.qualityOfLanguage as number,
    total: v.total as number,
  };
}

function rowToStoredSession(row: CloudSessionRow): StoredSession {
  const fb = row.feedback as FeedbackSummaryBlob | null;
  const examMarks = parseExamMarks(row.exam_marks);
  return {
    id: row.id,
    date: row.created_at,
    mode: row.mode,
    topicKey: row.topic_key,
    questionText: row.question_text ?? '',
    transcript: row.transcript ?? '',
    wordCount: row.word_count,
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    durationSec: row.duration_sec,
    xpEarned: row.xp_earned,
    feedbackSummary: fb?.biggest_opportunity ?? fb?.examiner_oneLiner ?? undefined,
    cefrLevel: fb?.cefrLevel,
    criticalIssueCount: typeof fb?.critical_count === 'number' ? fb.critical_count : undefined,
    ...(typeof row.practice_only === 'boolean' ? { practiceOnly: row.practice_only } : {}),
    ...(examMarks ? { examMarks } : {}),
    ...(typeof row.scoring_session_id === 'string' && row.scoring_session_id ? { scoringSessionId: row.scoring_session_id } : {}),
  };
}

// ── Streak on hydration ────────────────────────────────────────────────────────

/**
 * The streak the session history alone proves: consecutive practice days
 * ending today or yesterday (a streak not yet extended today is still alive).
 * Days are the learner's local calendar days, like analyticsService.updateStreak
 * (lib/localDay.ts). Exported for tests.
 */
export function streakFromSessions(sessions: StoredSession[]): { count: number; lastDate: string | null } {
  const days = Array.from(new Set(sessions.map(s => localDayOf(s.date)).filter(Boolean))).sort().reverse();
  const latest = days[0];
  if (!latest || (latest !== localDayBefore(0) && latest !== localDayBefore(1))) return { count: 0, lastDate: null };
  let count = 0;
  let cursor = latest;
  for (const day of days) {
    if (day !== cursor) break;
    count++;
    const [y, m, d] = cursor.split('-').map(Number);
    cursor = localDayBefore(1, new Date(y, m - 1, d, 12));
  }
  return { count, lastDate: latest };
}

/**
 * Hydration used to overwrite the device's streak with a recount that broke on
 * any day without a session today — so opening the app before practising reset
 * every signed-in learner's streak to 0 (and stamped lastDate = today, so the
 * day's first session could not raise it). It also wiped Streak Freeze/Repair
 * results. Now the device's own streak is kept unless the merged history proves
 * a more recent or longer one (another device practised since). Exported for tests.
 */
export function mergeStreak(local: AnalyticsData['streak'], sessions: StoredSession[]): AnalyticsData['streak'] {
  const derived = streakFromSessions(sessions);
  if (!derived.lastDate) return local;
  if (!local.lastDate || derived.lastDate > local.lastDate) {
    return { ...local, count: derived.count, lastDate: derived.lastDate, brokenAt: null };
  }
  if (derived.lastDate === local.lastDate && derived.count > local.count) {
    return { ...local, count: derived.count };
  }
  return local;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function pushSessionToCloud(userId: string, session: Session): Promise<boolean> {
  if (!supabaseConfigured) return false;

  const syncedIds = getSyncedIds();
  if (syncedIds.has(session.id)) return true;

  try {
    const row = sessionToRow(userId, session);
    const { error } = await upsertSessionRow(row);

    if (error) {
      console.warn('[sessionSync] push failed:', error.message);
      captureError(error, { area: 'sync', stage: 'sessionSync.push' });
      addPendingId(session.id);
      return false;
    }

    addSyncedId(session.id);
    removePendingId(session.id);
    return true;
  } catch (err) {
    console.warn('[sessionSync] push error:', err);
    // Offline network errors are dropped by captureError; the session is retried later anyway.
    captureError(err, { area: 'sync', stage: 'sessionSync.push' });
    addPendingId(session.id);
    return false;
  }
}

/**
 * The newest MAX_STORED_SESSIONS rows, of any age (was: the last 90 days, so a
 * learner who changed phone lost older history — and the topic unlocks and exam
 * results derived from it). Returned oldest first.
 */
export async function pullSessionsFromCloud(userId: string): Promise<StoredSession[] | null> {
  if (!supabaseConfigured) return null;
  try {
    const query = (columns: string) => supabase
      .from('sessions')
      .select(columns)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_STORED_SESSIONS);

    let { data, error } = await query(`${BASE_COLUMNS}, ${EXAM_COLUMNS.join(', ')}`);
    if (error && mentionsExamColumn(error.message)) {
      ({ data, error } = await query(BASE_COLUMNS));
    }

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[sessionSync] pull failed:', error.message);
      }
      return null;
    }

    return ((data ?? []) as unknown as CloudSessionRow[]).map(rowToStoredSession).reverse();
  } catch (err) {
    console.warn('[sessionSync] pull error:', err);
    return null;
  }
}

/** The local copy wins field by field; the cloud copy only fills what the local one lacks (e.g. exam marks on a copy restored before they synced). */
function fillMissingFields(local: StoredSession, cloud: StoredSession): StoredSession {
  const out: Record<string, unknown> = { ...local };
  for (const [key, value] of Object.entries(cloud)) {
    if (out[key] === undefined && value !== undefined) out[key] = value;
  }
  return out as unknown as StoredSession;
}

export function mergeSessionLists(local: StoredSession[], cloud: StoredSession[]): StoredSession[] {
  const byId = new Map<string, StoredSession>();
  for (const s of local) byId.set(s.id, s);
  for (const s of cloud) {
    const mine = byId.get(s.id);
    byId.set(s.id, mine ? fillMissingFields(mine, s) : s);
  }
  const merged = Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
  // Same bound analyticsService.recordSession applies — cloud hydration must
  // not be able to reinflate the array past the quota-safe cap (Phase 1.5).
  return merged.length > MAX_STORED_SESSIONS ? merged.slice(-MAX_STORED_SESSIONS) : merged;
}

export async function hydrateSessionsFromCloud(
  userId: string
): Promise<{ mergedSessions: StoredSession[]; cloudIds: Set<string> }> {
  try {
    const cloudSessions = await pullSessionsFromCloud(userId);
    const cloudIds = new Set<string>((cloudSessions ?? []).map(s => s.id));

    const local = loadAnalyticsData();
    const merged = mergeSessionLists(local.sessions, cloudSessions ?? []);
    const streak = mergeStreak(local.streak, merged);
    // Never lower it: sessions are capped at MAX_STORED_SESSIONS, the running total is not.
    const totalWords = Math.max(local.totalWords || 0, merged.reduce((sum, s) => sum + s.wordCount, 0));

    const mergedData: AnalyticsData = {
      ...local,
      sessions: merged,
      totalWords,
      streak,
    };

    storageSet(STORAGE_KEYS.analytics, mergedData);
    if (cloudSessions) void repairCloudExamFields(userId, merged, cloudSessions);
    return { mergedSessions: merged, cloudIds };
  } catch (err) {
    console.warn('[sessionSync] hydrateSessionsFromCloud error:', err);
    const local = loadAnalyticsData();
    return { mergedSessions: local.sessions, cloudIds: new Set() };
  }
}

export async function backfillSessionsToCloud(
  userId: string,
  local: StoredSession[],
  cloudIds: Set<string>
): Promise<number> {
  if (!supabaseConfigured) return 0;
  const syncedIds = getSyncedIds();
  let pushed = 0;

  for (const stored of local) {
    if (cloudIds.has(stored.id) || syncedIds.has(stored.id)) continue;
    try {
      const { error } = await upsertSessionRow(storedToRow(userId, stored));
      if (!error) {
        addSyncedId(stored.id);
        pushed++;
      }
    } catch {
      // fire-and-forget: skip silently on individual failure
    }
  }

  return pushed;
}

export async function flushPendingQueue(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const pending = getPendingIds();
  if (pending.length === 0) return;

  const local = loadAnalyticsData();
  const sessionMap = new Map(local.sessions.map(s => [s.id, s]));

  for (const id of pending) {
    const stored = sessionMap.get(id);
    if (!stored) {
      removePendingId(id);
      continue;
    }
    try {
      const { error } = await upsertSessionRow(storedToRow(userId, stored));
      if (!error) {
        addSyncedId(id);
        removePendingId(id);
      }
    } catch {
      // leave in queue for next trigger
    }
  }
}

/**
 * Exam sessions pushed before the exam columns synced reached the cloud without
 * practiceOnly/examMarks/scoringSessionId. When this device still holds them,
 * send them again so a later restore elsewhere keeps them. Fire-and-forget.
 * Exported for tests.
 */
export async function repairCloudExamFields(
  userId: string,
  local: StoredSession[],
  cloud: StoredSession[],
): Promise<number> {
  if (!supabaseConfigured) return 0;
  const cloudById = new Map(cloud.map(s => [s.id, s]));
  let repaired = 0;
  for (const stored of local) {
    const remote = cloudById.get(stored.id);
    if (!remote) continue;
    const missing =
      (stored.practiceOnly !== undefined && remote.practiceOnly === undefined) ||
      (stored.examMarks !== undefined && remote.examMarks === undefined) ||
      (stored.scoringSessionId !== undefined && remote.scoringSessionId === undefined);
    if (!missing) continue;
    try {
      // Only the exam columns: re-sending the whole row would replace the cloud's
      // fuller feedback blob with this device's short summary.
      const { error } = await supabase
        .from('sessions')
        .update(examColumns(stored))
        .eq('id', stored.id)
        .eq('user_id', userId);
      if (error) return repaired; // schema or permission problem — the next hydration retries
      repaired++;
    } catch {
      return repaired;
    }
  }
  return repaired;
}

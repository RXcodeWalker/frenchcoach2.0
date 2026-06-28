import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { Session } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type CloudSessionRow = {
  id: string;
  user_id: string;
  mode: string;
  topic_key: string | null;
  question_text: string | null;
  transcript: string | null;
  word_count: number;
  score: number;
  xp_earned: number;
  duration_sec: number;
  feedback: Record<string, unknown> | null;
  created_at: string;
};

type FeedbackSummaryBlob = {
  schemaVersion?: number;
  scores?: { overall: number; communication?: number; language?: number; fluency?: number };
  cefrLevel?: string;
  biggest_opportunity?: string;
  examiner_oneLiner?: string;
  best_moment?: string;
  critical_count?: number;
};

export interface StoredSession {
  id: string;
  date: string;
  mode: string;
  topicKey: string | null;
  questionText: string;
  transcript: string;
  wordCount: number;
  score: number;
  durationSec: number;
  feedbackSummary?: string;
  targetSkillIds?: string[];
  cefrLevel?: string;
  criticalIssueCount?: number;
}

interface AnalyticsData {
  sessions: StoredSession[];
  totalWords: number;
  streak: { count: number; lastDate: string | null };
  challengeLog: Record<string, boolean>;
}

const SYNC_WINDOW_DAYS = 90;

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

  const scores = f.scores as Record<string, unknown> | undefined;
  if (scores && typeof scores === 'object') {
    blob.scores = {
      overall: (scores.overall as number) ?? 0,
      communication: scores.communication as number | undefined,
      language: scores.language as number | undefined,
      fluency: scores.fluency as number | undefined,
    };
  }

  if (typeof f.cefrLevel === 'string') blob.cefrLevel = f.cefrLevel;
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

function sessionToRow(userId: string, session: Session): Omit<CloudSessionRow, 'user_id'> & { user_id: string } {
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
  };
}

function rowToStoredSession(row: CloudSessionRow): StoredSession {
  const fb = row.feedback as FeedbackSummaryBlob | null;
  return {
    id: row.id,
    date: row.created_at,
    mode: row.mode,
    topicKey: row.topic_key,
    questionText: row.question_text ?? '',
    transcript: row.transcript ?? '',
    wordCount: row.word_count,
    score: row.score,
    durationSec: row.duration_sec,
    feedbackSummary: fb?.biggest_opportunity ?? fb?.examiner_oneLiner ?? undefined,
    cefrLevel: fb?.cefrLevel,
    criticalIssueCount: typeof fb?.critical_count === 'number' ? fb.critical_count : undefined,
  };
}

// ── Streak recalculation ───────────────────────────────────────────────────────

function recomputeStreak(sessions: StoredSession[]): { count: number; lastDate: string } {
  const today = new Date().toISOString().slice(0, 10);
  const uniqueDates = Array.from(
    new Set(sessions.map(s => s.date.slice(0, 10)))
  ).sort().reverse();

  let count = 0;
  let cursor = today;

  for (const date of uniqueDates) {
    if (date === cursor) {
      count++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else if (date < cursor) {
      break;
    }
  }

  return { count, lastDate: today };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function pushSessionToCloud(userId: string, session: Session): Promise<boolean> {
  if (!supabaseConfigured) return false;

  const syncedIds = getSyncedIds();
  if (syncedIds.has(session.id)) return true;

  try {
    const row = sessionToRow(userId, session);
    const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[sessionSync] push failed:', error.message);
      addPendingId(session.id);
      return false;
    }

    addSyncedId(session.id);
    removePendingId(session.id);
    return true;
  } catch (err) {
    console.warn('[sessionSync] push error:', err);
    addPendingId(session.id);
    return false;
  }
}

export async function pullSessionsFromCloud(userId: string): Promise<StoredSession[] | null> {
  if (!supabaseConfigured) return null;
  try {
    const cutoff = new Date(Date.now() - SYNC_WINDOW_DAYS * 86400000).toISOString();
    const { data, error } = await supabase
      .from('sessions')
      .select('id, user_id, mode, topic_key, question_text, transcript, word_count, score, xp_earned, duration_sec, feedback, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[sessionSync] pull failed:', error.message);
      }
      return null;
    }

    return (data ?? []).map(row => rowToStoredSession(row as CloudSessionRow));
  } catch (err) {
    console.warn('[sessionSync] pull error:', err);
    return null;
  }
}

export function mergeSessionLists(local: StoredSession[], cloud: StoredSession[]): StoredSession[] {
  const byId = new Map<string, StoredSession>();
  for (const s of local) byId.set(s.id, s);
  for (const s of cloud) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function hydrateSessionsFromCloud(
  userId: string
): Promise<{ mergedSessions: StoredSession[]; cloudIds: Set<string> }> {
  try {
    const cloudSessions = await pullSessionsFromCloud(userId);
    const cloudIds = new Set<string>((cloudSessions ?? []).map(s => s.id));

    const local = loadAnalyticsData();
    const merged = mergeSessionLists(local.sessions, cloudSessions ?? []);
    const streak = recomputeStreak(merged);
    const totalWords = merged.reduce((sum, s) => sum + s.wordCount, 0);

    const mergedData: AnalyticsData = {
      ...local,
      sessions: merged,
      totalWords,
      streak,
    };

    localStorage.setItem(STORAGE_KEYS.analytics, JSON.stringify(mergedData));
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
      const row: CloudSessionRow = {
        id: stored.id,
        user_id: userId,
        mode: stored.mode,
        topic_key: stored.topicKey,
        question_text: stored.questionText.slice(0, 500),
        transcript: stored.transcript.slice(0, 2000),
        word_count: stored.wordCount,
        score: stored.score,
        xp_earned: 0,
        duration_sec: stored.durationSec,
        feedback: stored.feedbackSummary
          ? { biggest_opportunity: stored.feedbackSummary, cefrLevel: stored.cefrLevel, critical_count: stored.criticalIssueCount }
          : null,
        created_at: stored.date,
      };
      const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'id' });
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
      const row: CloudSessionRow = {
        id: stored.id,
        user_id: userId,
        mode: stored.mode,
        topic_key: stored.topicKey,
        question_text: stored.questionText.slice(0, 500),
        transcript: stored.transcript.slice(0, 2000),
        word_count: stored.wordCount,
        score: stored.score,
        xp_earned: 0,
        duration_sec: stored.durationSec,
        feedback: stored.feedbackSummary
          ? { biggest_opportunity: stored.feedbackSummary, cefrLevel: stored.cefrLevel, critical_count: stored.criticalIssueCount }
          : null,
        created_at: stored.date,
      };
      const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'id' });
      if (!error) {
        addSyncedId(id);
        removePendingId(id);
      }
    } catch {
      // leave in queue for next trigger
    }
  }
}

// Copied verbatim from analytics.js — minimal TS wrapper only
import type { Session, FeedbackV2, TopicMasteryEntry } from '../../types';

import { hasStreakFreeze, consumeStreakFreeze, consumeItem } from '../progression/progressionService';
import { STORAGE_KEYS } from '../persistence/storage';

const STORAGE_KEY = STORAGE_KEYS.analytics;
const MASTERY_KEY_CONST = STORAGE_KEYS.topicMastery;

export interface StoredSession {
  id: string;
  date: string;
  mode: string;
  topicKey: string | null;
  questionText: string;
  transcript: string;
  wordCount: number;
  score: number | null;
  durationSec: number;
  // ── Coach MVP: compact coaching summary (all optional, backward compatible) ──
  /** Short examiner/opportunity one-liner derived from FeedbackV2. */
  feedbackSummary?: string;
  /** Graph-resolved skill node IDs implicated by this answer. */
  targetSkillIds?: string[];
  cefrLevel?: string;
  criticalIssueCount?: number;
}

/** Options the coach orchestrator can pass to enrich the stored session. */
export interface RecordSessionOptions {
  /** Skill node IDs resolved from evidence so analytics need not re-parse feedback. */
  targetSkillIds?: string[];
}

/** Derive a compact coaching summary from a session's FeedbackV2, when present. */
function deriveFeedbackSummary(feedback?: FeedbackV2): string | undefined {
  if (!feedback) return undefined;
  return (
    feedback.biggest_opportunity ||
    feedback.examiner?.oneLiner ||
    feedback.best_moment ||
    (feedback.cefrLevel ? `CEFR ${feedback.cefrLevel}` : undefined)
  );
}

interface AnalyticsData {
  sessions: StoredSession[];
  totalWords: number;
  streak: {
    count: number;
    lastDate: string | null;
    /** Streak Repair (Shop plan §14.4): the count just before it broke, and when it broke — cleared once repaired or once the 48h window passes. */
    brokenAt?: { previousCount: number; brokenDate: string } | null;
  };
  challengeLog: Record<string, boolean>;
}

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function load(): AnalyticsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], totalWords: 0, streak: { count: 0, lastDate: null }, challengeLog: {} };
    const parsed = JSON.parse(raw);
    const seen = new Set<string>();
    const sessions = (parsed.sessions || []).filter((s: StoredSession) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return {
      sessions,
      totalWords: parsed.totalWords || 0,
      streak: parsed.streak || { count: 0, lastDate: null },
      challengeLog: parsed.challengeLog || {},
    };
  } catch {
    return { sessions: [], totalWords: 0, streak: { count: 0, lastDate: null }, challengeLog: {} };
  }
}

function save(data: AnalyticsData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota exceeded — degrade silently */ }
}

function updateStreak(data: AnalyticsData) {
  const today = dateKey();
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  const last = data.streak.lastDate;

  if (last === today) return data;

  if (last === yesterday) {
    data.streak.count += 1;
    data.streak.brokenAt = null;
  } else if (last) {
    // There's a gap. Check if it's just 1 day gap and if we have a freeze.
    // If last was day-before-yesterday, and we have a freeze, we can save it.
    const dayBeforeYesterday = dateKey(new Date(Date.now() - 172800000));
    if (last === dayBeforeYesterday && hasStreakFreeze()) {
      consumeStreakFreeze();
      data.streak.count += 1; // Preserve and increment as if yesterday was active
      data.streak.brokenAt = null;
    } else {
      // Streak Repair (§14.4): record what was lost and when, so a Streak
      // Repair item can restore it if used within 48h of this break.
      if (data.streak.count > 0) {
        data.streak.brokenAt = { previousCount: data.streak.count, brokenDate: today };
      }
      data.streak.count = 1;
    }
  } else {
    data.streak.count = 1;
  }

  data.streak.lastDate = today;
  return data;
}

export function recordSession(session: Session, options?: RecordSessionOptions): StoredSession {
  const data = load();
  const feedback = session.feedback as FeedbackV2 | undefined;
  const stored: StoredSession = {
    id:           session.id,
    date:         session.createdAt,
    mode:         session.mode,
    topicKey:     session.topicKey ?? null,
    questionText: (session.questionText ?? "").slice(0, 200),
    transcript:   (session.transcript ?? "").slice(0, 1000),
    wordCount:    session.wordCount,
    score:        session.score,
    durationSec:  session.durationSec,
    feedbackSummary:    deriveFeedbackSummary(feedback),
    targetSkillIds:     options?.targetSkillIds,
    cefrLevel:          feedback?.cefrLevel,
    criticalIssueCount: feedback?.grammar?.critical?.length,
  };
  if (data.sessions.some(s => s.id === stored.id)) return stored;
  data.sessions.push(stored);
  data.totalWords = (data.totalWords || 0) + session.wordCount;
  updateStreak(data);
  save(data);
  return stored;
}

export function getSessionHistory(): StoredSession[] {
  return [...load().sessions].reverse();
}

export function getStreakCount(): number {
  return load().streak.count;
}

const REPAIR_WINDOW_MS = 48 * 3600 * 1000;

/** Streak Repair (Shop plan §14.4): true only while a broken streak is still within the 48h repair window. */
export function canRepairStreak(): boolean {
  const brokenAt = load().streak.brokenAt;
  if (!brokenAt) return false;
  const brokenAtMs = new Date(brokenAt.brokenDate).getTime();
  return Date.now() - brokenAtMs < REPAIR_WINDOW_MS;
}

/**
 * Restore a streak lost less than 48 hours ago (§14.4), consuming one
 * Streak Repair via the same generic, server-reconciled consumeItem path
 * Streak Freeze uses (§15 Phase 5). Local-effect/server-payment asymmetry is
 * accepted for the same reason documented on Streak Freeze: streak lives
 * only in localStorage (profiles.streak_days is never written, A1).
 */
export function repairStreak(): boolean {
  const data = load();
  if (!canRepairStreak()) return false;
  if (!consumeItem('streak_repair')) return false;

  data.streak.count = data.streak.brokenAt!.previousCount + 1;
  data.streak.lastDate = dateKey();
  data.streak.brokenAt = null;
  save(data);
  return true;
}

export interface DailyStats {
  day: string;
  /** Chart-plotting value — 0 when there is no real score to show (no sessions,
   *  or sessions that were all unscored). Never trust this as "the average was
   *  actually zero"; check scoredSessions for that. */
  score: number;
  sessions: number;
  /** How many of `sessions` had a real (non-null) score — 0 means `score`
   *  above is a placeholder, not a real average, even if `sessions > 0`. */
  scoredSessions: number;
}

export function getDailyStats(days = 7): DailyStats[] {
  const sessions = load().sessions;
  const result: DailyStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = dateKey(d);
    const daySessions = sessions.filter(s => s.date.slice(0, 10) === key);
    const scored = daySessions.map(s => s.score).filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
    const avgScore = scored.length
      ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
      : 0;
    result.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), score: avgScore, sessions: daySessions.length, scoredSessions: scored.length });
  }
  return result;
}

export function getStats() {
  const data = load();
  const sessions = data.sessions;
  if (sessions.length === 0) return { totalSessions: 0, avgScore: null, bestScore: null, totalWords: data.totalWords || 0, streak: data.streak.count, byTopic: {}, recentSessions: [], allSessions: [] };

  const scores = sessions.map(s => s.score).filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  const byTopic: Record<string, { count: number; totalScore: number; avg: number }> = {};
  sessions.forEach(s => {
    if (s.topicKey && typeof s.score === 'number') {
      if (!byTopic[s.topicKey]) byTopic[s.topicKey] = { count: 0, totalScore: 0, avg: 0 };
      byTopic[s.topicKey].count++;
      byTopic[s.topicKey].totalScore += s.score;
    }
  });
  Object.keys(byTopic).forEach(k => { byTopic[k].avg = Math.round((byTopic[k].totalScore / byTopic[k].count) * 10) / 10; });

  return {
    totalSessions: sessions.length,
    avgScore,
    bestScore,
    totalWords: data.totalWords || 0,
    streak: data.streak.count,
    byTopic,
    recentSessions: [...sessions].reverse().slice(0, 5),
    allSessions: [...sessions].reverse(),
  };
}

export function getTopicSessionCounts(): Record<string, number> {
  return load().sessions.reduce((acc, s) => {
    if (s.topicKey) acc[s.topicKey] = (acc[s.topicKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function markChallengeComplete() {
  const data = load();
  data.challengeLog[dateKey()] = true;
  save(data);
}

export function isTodayChallengeComplete(): boolean {
  return !!load().challengeLog[dateKey()];
}

export function resetAll() { localStorage.removeItem(STORAGE_KEY); }
export function exportData() { return JSON.stringify(load(), null, 2); }

// ── Topic mastery persistence ──────────────────────────────────────────────────

const MASTERY_KEY = MASTERY_KEY_CONST;

export function updateTopicMastery(entry: TopicMasteryEntry) {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    const current = raw ? JSON.parse(raw) : {};
    current[entry.topicKey] = entry;
    localStorage.setItem(MASTERY_KEY, JSON.stringify(current));
  } catch { /* quota exceeded — degrade silently */ }
}

export function getTopicMasteryAll(): Record<string, TopicMasteryEntry> {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

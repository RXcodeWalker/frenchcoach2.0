// Copied verbatim from analytics.js — minimal TS wrapper only
import type { Session } from '../../types';

import { hasStreakFreeze, useStreakFreeze } from '../progression/progressionService';
import { STORAGE_KEYS } from '../persistence/storage';

const STORAGE_KEY = STORAGE_KEYS.analytics;
const MASTERY_KEY_CONST = STORAGE_KEYS.topicMastery;

interface StoredSession {
  id: string;
  date: string;
  mode: string;
  topicKey: string | null;
  questionText: string;
  transcript: string;
  wordCount: number;
  score: number;
  durationSec: number;
}

interface AnalyticsData {
  sessions: StoredSession[];
  totalWords: number;
  streak: { count: number; lastDate: string | null };
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function updateStreak(data: AnalyticsData) {
  const today = dateKey();
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  const last = data.streak.lastDate;

  if (last === today) return data;
  
  if (last === yesterday) {
    data.streak.count += 1;
  } else if (last) {
    // There's a gap. Check if it's just 1 day gap and if we have a freeze.
    // If last was day-before-yesterday, and we have a freeze, we can save it.
    const dayBeforeYesterday = dateKey(new Date(Date.now() - 172800000));
    if (last === dayBeforeYesterday && hasStreakFreeze()) {
      useStreakFreeze();
      data.streak.count += 1; // Preserve and increment as if yesterday was active
    } else {
      data.streak.count = 1;
    }
  } else {
    data.streak.count = 1;
  }

  data.streak.lastDate = today;
  return data;
}

export function recordSession(session: Session): StoredSession {
  const data = load();
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

export interface DailyStats { day: string; score: number; sessions: number }

export function getDailyStats(days = 7): DailyStats[] {
  const sessions = load().sessions;
  const result: DailyStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = dateKey(d);
    const daySessions = sessions.filter(s => s.date.slice(0, 10) === key);
    const avgScore = daySessions.length
      ? Math.round((daySessions.reduce((a, b) => a + b.score, 0) / daySessions.length) * 10) / 10
      : 0;
    result.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), score: avgScore, sessions: daySessions.length });
  }
  return result;
}

export function getStats() {
  const data = load();
  const sessions = data.sessions;
  if (sessions.length === 0) return { totalSessions: 0, avgScore: null, bestScore: null, totalWords: data.totalWords || 0, streak: data.streak.count, byTopic: {}, recentSessions: [], allSessions: [] };

  const scores = sessions.map(s => s.score).filter(s => typeof s === "number");
  const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  const byTopic: Record<string, { count: number; totalScore: number; avg: number }> = {};
  sessions.forEach(s => {
    if (s.topicKey) {
      if (!byTopic[s.topicKey]) byTopic[s.topicKey] = { count: 0, totalScore: 0, avg: 0 };
      byTopic[s.topicKey].count++;
      byTopic[s.topicKey].totalScore += s.score || 0;
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

export function updateTopicMastery(entry: { topicKey: string; sessionsCompleted: number; uniqueQuestionsAnswered: string[]; averageScore: number; lastSessionAt: string; mastered: boolean; masteredAt?: string; badge?: string }) {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    const current = raw ? JSON.parse(raw) : {};
    current[entry.topicKey] = entry;
    localStorage.setItem(MASTERY_KEY, JSON.stringify(current));
  } catch {}
}

export function getTopicMasteryAll(): Record<string, { topicKey: string; sessionsCompleted: number; uniqueQuestionsAnswered: string[]; averageScore: number; lastSessionAt: string; mastered: boolean; masteredAt?: string; badge?: string }> {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

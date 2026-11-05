import { getProgressionState } from '../progression/progressionService';
import { getProblems, getInterventions } from './interventionService';
import { storageGet, STORAGE_KEYS } from '../persistence/storage';
import { getSessionHistory, type StoredSession } from '../analytics/analyticsService';
import { parseDrillSessionId } from '../../features/rolePlayDrill/drillProgress';
import { examSummary } from '../../features/progress/progressSummary';
import { localDayOf } from '../../lib/localDay';
import { REPEAT_IMPROVEMENT_POINTS, RETURN_AFTER_DAYS, type AchievementContext } from '../../data/achievements';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';

interface BuildParams {
  finalScore: number | null;
  streakDays: number;
  totalSessionsAfter: number;
  topicsUsed: string[];
  beliefSnapshot: EvidenceBeliefSnapshot | null;
  examCompleted: boolean;
  examType: 'igcse' | 'practice' | null;
  /** This answer's feedback credited a self-correction. */
  selfCorrected?: boolean;
}

export interface AchievementHistoryCounts {
  /** Distinct Learn topics with at least one recorded answer. */
  topicKeys: string[];
  /** Distinct role plays answered at least once (Role-play drill cards + scenario role plays). */
  rolePlayKeys: string[];
  /** Distinct local days with a spoken answer or exam. */
  daysPractised: number;
  /** Words in the longest single answer (an exam's whole-attempt word count is not one answer). */
  longestAnswerWords: number;
  /** A Learn question answered again scored REPEAT_IMPROVEMENT_POINTS above its first scored try. */
  improvedOnRepeat: boolean;
  /** A counted Exam Sim beat the counted one before it. */
  examImproved: boolean;
  /** The latest practice day came RETURN_AFTER_DAYS or more after the one before it. */
  returnedAfterBreak: boolean;
}

type HistorySession = Pick<StoredSession, 'id' | 'mode' | 'topicKey' | 'date' | 'wordCount' | 'score' | 'questionText' | 'practiceOnly' | 'examMarks'>;

const ROLEPLAY_ID = /^roleplay-(.+)-\d+-\d+$/;
/** Modes where the learner spoke French (games and drills that write no Session never appear). */
const SPEAKING_MODES = new Set(['practice', 'exam', 'story', 'roleplay', 'daily_news']);
/** Modes where one Session is one answer. */
const SINGLE_ANSWER_MODES = new Set(['practice', 'story', 'roleplay', 'daily_news']);
const DAY_MS = 86_400_000;

/**
 * Counts that span sessions, read from the stored history rather than from a
 * per-session argument or a counter nothing increments — so Profile's
 * progress bars read exactly what the predicates do. Pure over `sessions`
 * (any order).
 */
export function achievementHistoryCounts(sessions: HistorySession[]): AchievementHistoryCounts {
  const topics = new Set<string>();
  const rolePlays = new Set<string>();
  const days = new Set<string>();
  let longestAnswerWords = 0;

  for (const s of sessions) {
    if (s.mode === 'practice' && s.topicKey) topics.add(s.topicKey);
    if (s.mode === 'story') rolePlays.add(`drill:${parseDrillSessionId(s.id)?.cardId ?? 'legacy'}`);
    if (s.mode === 'roleplay') rolePlays.add(`scenario:${ROLEPLAY_ID.exec(s.id)?.[1] ?? 'legacy'}`);
    if (SPEAKING_MODES.has(s.mode)) {
      const day = localDayOf(s.date);
      if (day) days.add(day);
    }
    if (SINGLE_ANSWER_MODES.has(s.mode) && Number.isFinite(s.wordCount)) {
      longestAnswerWords = Math.max(longestAnswerWords, s.wordCount);
    }
  }

  return {
    topicKeys: [...topics],
    rolePlayKeys: [...rolePlays],
    daysPractised: days.size,
    longestAnswerWords,
    improvedOnRepeat: improvedOnRepeat(sessions),
    examImproved: examImproved(sessions),
    returnedAfterBreak: returnedAfterBreak([...days]),
  };
}

function chronological(sessions: HistorySession[]): HistorySession[] {
  return [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function improvedOnRepeat(sessions: HistorySession[]): boolean {
  const first = new Map<string, number>();
  for (const s of chronological(sessions)) {
    if (s.mode !== 'practice' || !s.questionText || typeof s.score !== 'number' || !Number.isFinite(s.score)) continue;
    const before = first.get(s.questionText);
    if (before === undefined) first.set(s.questionText, s.score);
    else if (s.score >= before + REPEAT_IMPROVEMENT_POINTS) return true;
  }
  return false;
}

function examImproved(sessions: HistorySession[]): boolean {
  // examSummary counts only attempts that count toward progress (ADR-0007), newest first.
  const counted = examSummary(chronological(sessions).reverse() as StoredSession[]).counted;
  return counted.some((attempt, i) => i + 1 < counted.length && attempt.total > counted[i + 1].total);
}

function returnedAfterBreak(dayKeys: string[]): boolean {
  if (dayKeys.length < 2) return false;
  const sorted = [...dayKeys].sort();
  const noon = (key: string) => new Date(`${key}T12:00:00`).getTime();
  const gap = Math.round((noon(sorted[sorted.length - 1]) - noon(sorted[sorted.length - 2])) / DAY_MS);
  return gap >= RETURN_AFTER_DAYS;
}

export function buildAchievementContext(params: BuildParams): AchievementContext {
  const { xp } = getProgressionState();
  const raw = storageGet<{ roleplayCount?: number }>(STORAGE_KEYS.progression, {});
  // Every caller records its session before building this context, so the
  // history already includes the answer just given.
  const history = achievementHistoryCounts(getSessionHistory());

  return {
    score:              params.finalScore,
    streak:             params.streakDays,
    totalSessions:      params.totalSessionsAfter,
    topicsUsed:         [...new Set([...history.topicKeys, ...params.topicsUsed])],
    beliefSnapshot:     params.beliefSnapshot,
    problems:           getProblems(),
    interventions:      getInterventions(),
    xp,
    roleplayCount:      Math.max(raw.roleplayCount ?? 0, history.rolePlayKeys.length),
    examCompleted:      params.examCompleted,
    examType:           params.examType,
    daysPractised:      history.daysPractised,
    longestAnswerWords: history.longestAnswerWords,
    improvedOnRepeat:   history.improvedOnRepeat,
    examImproved:       history.examImproved,
    selfCorrected:      params.selfCorrected ?? false,
    returnedAfterBreak: history.returnedAfterBreak,
  };
}

import { getProgressionState } from '../progression/progressionService';
import { getProblems, getInterventions } from './interventionService';
import { storageGet, STORAGE_KEYS } from '../persistence/storage';
import { getSessionHistory, type StoredSession } from '../analytics/analyticsService';
import { parseDrillSessionId } from '../../features/rolePlayDrill/drillProgress';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type { AchievementContext } from '../../data/achievements';

interface BuildParams {
  finalScore: number | null;
  streakDays: number;
  totalSessionsAfter: number;
  topicsUsed: string[];
  beliefSnapshot: EvidenceBeliefSnapshot | null;
  examCompleted: boolean;
  examType: 'igcse' | 'practice' | null;
}

export interface AchievementHistoryCounts {
  /** Distinct Learn topics with at least one recorded answer. */
  topicKeys: string[];
  /** Distinct role plays answered at least once (Role-play drill cards + scenario role plays). */
  rolePlayKeys: string[];
}

const ROLEPLAY_ID = /^roleplay-(.+)-\d+-\d+$/;

/**
 * Counts that span sessions, read from the stored history rather than from a
 * per-session argument or a counter nothing increments — so Polyglotte,
 * Explorateur and Causeur can actually unlock, and Profile's progress bars
 * read the same numbers the predicates do. Pure over `sessions`.
 */
export function achievementHistoryCounts(sessions: Pick<StoredSession, 'id' | 'mode' | 'topicKey'>[]): AchievementHistoryCounts {
  const topics = new Set<string>();
  const rolePlays = new Set<string>();
  for (const s of sessions) {
    if (s.mode === 'practice' && s.topicKey) topics.add(s.topicKey);
    if (s.mode === 'story') rolePlays.add(`drill:${parseDrillSessionId(s.id)?.cardId ?? 'legacy'}`);
    if (s.mode === 'roleplay') rolePlays.add(`scenario:${ROLEPLAY_ID.exec(s.id)?.[1] ?? 'legacy'}`);
  }
  return { topicKeys: [...topics], rolePlayKeys: [...rolePlays] };
}

export function buildAchievementContext(params: BuildParams): AchievementContext {
  const { xp } = getProgressionState();
  const raw = storageGet<{ grammarCoachUses?: number; roleplayCount?: number }>(
    STORAGE_KEYS.progression,
    {},
  );
  // Every caller records its session before building this context, so the
  // history already includes the answer just given.
  const history = achievementHistoryCounts(getSessionHistory());

  return {
    score:            params.finalScore,
    streak:           params.streakDays,
    totalSessions:    params.totalSessionsAfter,
    topicsUsed:       [...new Set([...history.topicKeys, ...params.topicsUsed])],
    beliefSnapshot:   params.beliefSnapshot,
    problems:         getProblems(),
    interventions:    getInterventions(),
    xp,
    grammarCoachUses: raw.grammarCoachUses ?? 0,
    roleplayCount:    Math.max(raw.roleplayCount ?? 0, history.rolePlayKeys.length),
    examCompleted:    params.examCompleted,
    examType:         params.examType,
  };
}

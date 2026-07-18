import { getProgressionState } from '../progression/progressionService';
import { getProblems, getInterventions } from './interventionService';
import { storageGet, STORAGE_KEYS } from '../persistence/storage';
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

export function buildAchievementContext(params: BuildParams): AchievementContext {
  const { xp } = getProgressionState();
  const raw = storageGet<{ grammarCoachUses?: number; roleplayCount?: number }>(
    STORAGE_KEYS.progression,
    {},
  );

  return {
    score:            params.finalScore,
    streak:           params.streakDays,
    totalSessions:    params.totalSessionsAfter,
    topicsUsed:       params.topicsUsed,
    beliefSnapshot:   params.beliefSnapshot,
    problems:         getProblems(),
    interventions:    getInterventions(),
    xp,
    grammarCoachUses: raw.grammarCoachUses ?? 0,
    roleplayCount:    raw.roleplayCount ?? 0,
    examCompleted:    params.examCompleted,
    examType:         params.examType,
  };
}

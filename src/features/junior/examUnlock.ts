import type { LearnerTrack } from '../../domain/junior/state';

/** Exam practice unlocks after this many finished Junior missions (any outcomes). */
export const EXAM_UNLOCK_MISSIONS = 5;

export function missionsFinished(missionsDone: Record<string, number> | undefined): number {
  return Object.values(missionsDone ?? {}).reduce((n, v) => n + v, 0);
}

/** Exam practice is open for exam-track learners, and for Junior after five finished missions. */
export function examPracticeUnlocked(track: LearnerTrack | undefined, missionsDone: Record<string, number> | undefined): boolean {
  if (track !== 'junior') return true;
  return missionsFinished(missionsDone) >= EXAM_UNLOCK_MISSIONS;
}

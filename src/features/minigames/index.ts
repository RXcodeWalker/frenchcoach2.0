// Types
export type {
  GamePhase,
  MinigameQuestion,
  BaseRunStats,
  AnswerHistoryEntry,
} from './types';

// Pure utilities
export { normalizeFrench } from './utils/normalizeFrench';
export { diceCoefficient } from './utils/diceCoefficient';
export {
  normalizeAcceptableAnswers,
  matchTypedAnswer,
} from './utils/matchAnswer';
export type { TranscriptMatchMode, TranscriptMatchOptions } from './utils/matchTranscript';
export {
  getRelevantTranscript,
  matchTranscript,
  matchTranscriptDelta,
} from './utils/matchTranscript';
export {
  getStreakMultiplier,
  DEFAULT_STREAK_TIERS,
  STANDARD_STREAK_TIERS,
} from './utils/getStreakMultiplier';
export type { StreakTier } from './utils/getStreakMultiplier';
export {
  gradeFromStats,
  RUBRICS,
  GRADE_STYLE_OVERRIDES,
} from './utils/gradeFromStats';
export type {
  LetterGrade,
  GradeRubric,
  GradeStyle,
  GradedResult,
} from './utils/gradeFromStats';
export { getSpeedMultiplier } from './utils/getSpeedMultiplier';
export type { SpeedMultiplierResult } from './utils/getSpeedMultiplier';
export { completeMinigameSession } from './utils/completeMinigameSession';
export type { CompleteMinigameSessionOptions } from './utils/completeMinigameSession';

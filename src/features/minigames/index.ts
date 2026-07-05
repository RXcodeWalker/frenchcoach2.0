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

// Hooks
export { useGameTimer } from './hooks/useGameTimer';
export type { GameTimerMode, UseGameTimerOptions, GameTimerState } from './hooks/useGameTimer';
export { useCountdown } from './hooks/useCountdown';
export type { UseCountdownOptions, CountdownState } from './hooks/useCountdown';
export { useStreakMultiplier } from './hooks/useStreakMultiplier';
export type {
  UseStreakMultiplierOptions,
  StreakMultiplierState,
} from './hooks/useStreakMultiplier';
export { useFloatingXP } from './hooks/useFloatingXP';
export type {
  FloatingXPItem,
  UseFloatingXPOptions,
  FloatingXPState,
} from './hooks/useFloatingXP';
export { useRunStats } from './hooks/useRunStats';
export type { RunStatsState } from './hooks/useRunStats';

// Animations
export {
  shakeAnimation,
  shakeTransition,
  countdownPopVariants,
  getTimerBarColor,
  getOverdriveClasses,
  getOverdriveCardClasses,
  getOverdriveStreakClasses,
  getModeCardClasses,
} from './animations';
export type { AccentColor } from './animations';

// Components
export { GameShell } from './components/GameShell';
export { GameCountdown } from './components/GameCountdown';
export { GameHUD } from './components/GameHUD';
export { GameTimerBar } from './components/GameTimerBar';
export { GameFeedbackOverlay } from './components/GameFeedbackOverlay';
export type { GameFeedbackType } from './components/GameFeedbackOverlay';
export { GameResultsCard } from './components/GameResultsCard';
export type { GameResultsStat } from './components/GameResultsCard';
export { FloatingXPOverlay } from './components/FloatingXPOverlay';
export { StreakBadge } from './components/StreakBadge';
export { ModePickerCard, ModePickerGrid } from './components/ModePickerCard';
export type { ModeOption } from './components/ModePickerCard';

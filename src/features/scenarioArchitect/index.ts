export {
  loadDraft,
  saveDraft,
  clearDraft,
  loadFavorites,
  saveFavorite,
  removeFavorite,
  hasSeenTutorial,
  markTutorialSeen,
  isTtsMuted,
  setTtsMuted,
  defaultDifficulty,
  persistDifficulty,
} from './persistence';

export {
  resolveCompletedObjectives,
  SUGGESTED_TURN_BUDGET,
  XP_PER_OBJECTIVE,
  XP_MISSION_BONUS,
} from './objectiveProgress';

export { tipsFromFeedback, mergeUniqueNotes } from './feedbackTips';
export { DIFFICULTY_OPTIONS, withDifficultyPersona, GENERATION_STAGES } from './difficulty';

export type {
  ArchitectDifficulty,
  ArchitectSessionConfig,
  FavoriteScenario,
  ArchitectPersistedDraft,
  MissionLanguageNote,
  MissionDebrief,
} from './types';

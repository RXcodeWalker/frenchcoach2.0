import type { GeneratedScenario } from '../../types';

/** NPC stance / language support — not arcade timers. */
export type ArchitectDifficulty = 'supported' | 'standard' | 'immersion';

export interface ArchitectSessionConfig {
  customScenario: GeneratedScenario;
  description: string;
  difficulty: ArchitectDifficulty;
  /** When true, skip briefing interstitial (e.g. replay). */
  skipBriefing?: boolean;
}

export interface FavoriteScenario {
  id: string;
  description: string;
  scenario: GeneratedScenario;
  savedAt: string;
}

export interface ArchitectPersistedDraft {
  description: string;
  scenario: GeneratedScenario | null;
  difficulty: ArchitectDifficulty;
  updatedAt: string;
}

export interface MissionLanguageNote {
  kind: 'tip' | 'vocab' | 'rephrase';
  text: string;
}

export interface MissionDebrief {
  completedObjectiveIndexes: number[];
  turnsTaken: number;
  xpEarned: number;
  languageNotes: MissionLanguageNote[];
  durationSec: number;
}

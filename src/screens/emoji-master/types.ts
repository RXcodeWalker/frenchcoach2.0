import type { LetterGrade } from '../../features/minigames/utils/gradeFromStats';
import type { EmojiQuestion } from '../../data/emojiQuestions';

export type GameMode = 'classic' | 'reverse' | 'hardcore' | 'blitz' | 'arena';

export type EmojiCategory = EmojiQuestion['category'] | 'all';

export type EndReason = 'completed' | 'victory' | 'defeat' | 'timeout' | 'quit';

export type RunPhase = 'idle' | 'countdown' | 'playing' | 'finished';

export interface RunConfig {
  mode: GameMode;
  category: EmojiCategory;
}

export interface EmojiAnswerHistoryEntry {
  questionId: string;
  emojis: string;
  french: string;
  english: string;
  promptKind: 'emoji' | 'french';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  latencyMs?: number;
}

export interface SessionCompletion {
  mode: GameMode;
  endReason: EndReason;
  modeScore: number;
  correctAnswers: number;
  totalAnswered: number;
  maxStreak: number;
  history: EmojiAnswerHistoryEntry[];
  xpAwarded: number;
}

export interface ModeBestEntry {
  modeScore: number;
  maxStreak: number;
  bestGrade: LetterGrade;
  updatedAt: string;
}

export interface EmojiMasterBestsV1 {
  version: 1;
  modes: Partial<Record<GameMode, ModeBestEntry>>;
}

export const FIXED_RUN_LENGTH = 10;
export const MIN_POOL_SIZE = 6;
export const BLITZ_SECONDS = 60;
export const HARDCORE_SECONDS_BY_DIFFICULTY: Record<1 | 2 | 3, number> = {
  1: 8,
  2: 6,
  3: 4,
};

export const FEEDBACK_DWELL_MS = {
  correct: 600,
  incorrect: 1200,
} as const;

export type GamePhase =
  | 'idle'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'finished';

export interface MinigameQuestion {
  english: string;
  french: string | string[];
  difficulty?: string;
  topic?: string;
  category?: string;
}

export interface BaseRunStats {
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  maxStreak: number;
  accuracy: number;
  level?: number;
  wave?: number;
}

export interface AnswerHistoryEntry {
  question: MinigameQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

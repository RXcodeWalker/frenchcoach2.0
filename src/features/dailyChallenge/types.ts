/** Daily Challenge (docs/systems/daily-challenge-and-leagues.md §2). Shapes of the RPCs. */

export interface DailyChallengeItem {
  position: number;
  english: string;
  theme: string;
  difficulty: 1 | 2 | 3;
  /** How many tiles a correct answer places (the rest are decoys). */
  wordCount: number;
  /** The tiles in display order. An answer is a list of indexes into this array. */
  tiles: string[];
  /** The learner's answer, once given (a given answer is final). */
  answer: { tiles: number[]; correct: boolean } | null;
  /** The model sentence and the rule — only after the item is answered (or the run is over). */
  solution: { french: string; explanation: string } | null;
}

export interface DailyChallengeRun {
  status: 'in_progress' | 'finished';
  startedAt: string;
  deadlineAt: string;
  finishedAt: string | null;
  correctCount: number;
  durationMs: number | null;
  /** Finished implausibly fast: no XP, not on the board. */
  flagged: boolean;
  xpAwarded: number;
  /** Place among everyone who finished today (not just the visible board). */
  rank: number | null;
}

export interface DailyChallengeState {
  challengeDate: string;
  resetsAt: string;
  itemCount: number;
  /** Learners who finished today's challenge (flagged runs excluded). */
  participants: number;
  streak: { current: number; best: number };
  run: DailyChallengeRun | null;
  /** Empty until the run is started: the items are revealed when the clock starts. */
  items: DailyChallengeItem[];
}

export type BoardScope = 'global' | 'friends';

export interface DailyChallengeBoardRow {
  rank: number;
  username: string;
  avatarEmoji: string | null;
  equippedFrame: string | null;
  equippedNameplate: string | null;
  correctCount: number;
  itemCount: number;
  durationMs: number;
  isMe: boolean;
}

export interface DailyChallengeBoard {
  challengeDate: string;
  scope: BoardScope;
  /** How many learners the board ranks (the rows hold the top 50 plus the caller). */
  total: number;
  rows: DailyChallengeBoardRow[];
}

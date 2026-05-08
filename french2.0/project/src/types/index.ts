export type Screen = 'home' | 'learn' | 'exam' | 'progress' | 'profile' | 'explore';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Beast Mode';

export interface UserProfile {
  id: string;
  username: string | null;
  total_xp: number;
  current_level: Level;
  streak_days: number;
  longest_streak: number;
  last_session_date: string | null;
  sessions_count: number;
  total_words_spoken: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'streak' | 'practice' | 'skill' | 'exam' | 'social';
}

export interface Topic {
  key: string;
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  description: string;
  questionsCount: number;
}

export interface Question {
  id: string;
  topicKey: string;
  text: string;
  hint: string;
  difficulty: 1 | 2 | 3;
  followUps: string[];
  modelAnswer: string;
  keyVocab: string[];
}

export interface FeedbackScore {
  communication: number;
  language: number;
  fluency: number;
  overall: number;
}

export interface GrammarError {
  theme: string;
  severity: 'major' | 'minor';
  msg: string;
  diagnostic: string;
  correction: string;
}

export interface Feedback {
  scores: FeedbackScore;
  grammar: {
    critical: GrammarError[];
    polish: GrammarError[];
  };
  vocabulary: { basic: string; upgrade: string }[];
  style: { label: string; suggestion: string }[];
  fillers: { word: string; count: number }[];
  wordCount: number;
  cefrLevel: string;
}

export interface Session {
  id: string;
  mode: 'practice' | 'exam' | 'challenge' | 'roleplay';
  topicKey?: string;
  questionText?: string;
  transcript?: string;
  wordCount: number;
  score: number;
  xpEarned: number;
  durationSec: number;
  feedback?: Feedback;
  createdAt: string;
}

export interface SkillData {
  label: string;
  value: number;
  color: string;
}

export interface ExamQuestion {
  id: string;
  text: string;
  timeLimit: number;
  answer?: string;
  score?: number;
  feedback?: string;
}

export interface XPAnimation {
  id: string;
  amount: number;
  x: number;
  y: number;
}

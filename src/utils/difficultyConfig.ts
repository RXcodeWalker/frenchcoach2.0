import type { DifficultyConfig, DifficultyTier } from '../types';
import type { Question } from '../types';
import type { Aim } from '../domain/learn/selection/sessionTarget';

/** docs §14 UX mock — Aim picker copy/icon, adaptive path only (learnAdaptiveDifficulty). */
export interface AimConfig {
  aim: Aim;
  label: string;
  description: string;
  icon: string;
}

export const AIM_CONFIG: Record<Aim, AimConfig> = {
  comfortable: {
    aim: 'comfortable',
    label: 'Comfortable',
    description: 'Mostly easier questions, to build confidence.',
    icon: '🌱',
  },
  balanced: {
    aim: 'balanced',
    label: 'Balanced',
    description: "Mostly at your level, with a question or two that stretch you.",
    icon: '🎯',
  },
  push: {
    aim: 'push',
    label: 'Push',
    description: 'More questions that challenge you above your level.',
    icon: '🔥',
  },
};

export const DIFFICULTY_CONFIG: Record<DifficultyTier, DifficultyConfig> = {
  beginner: {
    tier: 'beginner',
    label: 'Beginner',
    cefr: 'A1',
    icon: '🌱',
    color: 'emerald',
    description: 'Simple sentences, present tense, everyday topics',
    preferredQuestionDifficulty: [1],
    expectations: {
      wordCountTier1: 10,
      wordCountTier2: 25,
      wordCountTier3: 45,
      requireConnectors: false,
      requirePastTense: false,
      requireSubjunctive: false,
      requireMultiplePerspectives: false,
      requireDetailedJustification: false,
    },
  },

  intermediate: {
    tier: 'intermediate',
    label: 'Intermediate',
    cefr: 'A2',
    icon: '📚',
    color: 'blue',
    description: 'Connected sentences, past and future tenses',
    preferredQuestionDifficulty: [1, 2],
    expectations: {
      wordCountTier1: 15,
      wordCountTier2: 40,
      wordCountTier3: 70,
      requireConnectors: false,
      requirePastTense: false,
      requireSubjunctive: false,
      requireMultiplePerspectives: false,
      requireDetailedJustification: false,
    },
  },

  advanced: {
    tier: 'advanced',
    label: 'Advanced',
    cefr: 'B1',
    icon: '🎯',
    color: 'violet',
    description: 'Extended responses, multiple tenses, justified opinions',
    preferredQuestionDifficulty: [2, 3],
    expectations: {
      wordCountTier1: 20,
      wordCountTier2: 50,
      wordCountTier3: 80,
      requireConnectors: true,
      requirePastTense: true,
      requireSubjunctive: false,
      requireMultiplePerspectives: false,
      requireDetailedJustification: true,
    },
  },

  expert: {
    tier: 'expert',
    label: 'Expert',
    cefr: 'B1+/B2',
    icon: '🏆',
    color: 'amber',
    description: 'Complex structures, multiple perspectives, B2 register',
    preferredQuestionDifficulty: [2, 3],
    expectations: {
      wordCountTier1: 30,
      wordCountTier2: 65,
      wordCountTier3: 100,
      requireConnectors: true,
      requirePastTense: true,
      requireSubjunctive: true,
      requireMultiplePerspectives: true,
      requireDetailedJustification: true,
    },
  },
};

export const DEFAULT_DIFFICULTY: DifficultyTier = 'intermediate';

export function preferredFirst(questions: Question[], difficulty: DifficultyTier): Question[] {
  const preferred = DIFFICULTY_CONFIG[difficulty].preferredQuestionDifficulty;
  const primary = questions.filter(q => preferred.includes(q.difficulty as 1 | 2 | 3));
  const secondary = questions.filter(q => !preferred.includes(q.difficulty as 1 | 2 | 3));
  return [...primary, ...secondary];
}

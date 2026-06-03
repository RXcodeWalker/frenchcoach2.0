import type { DifficultyConfig, DifficultyTier } from '../types';
import type { Question } from '../types';

export const DIFFICULTY_CONFIG: Record<DifficultyTier, DifficultyConfig> = {
  beginner: {
    tier: 'beginner',
    label: 'Beginner',
    cefr: 'A1',
    cefrTarget: 'A1',
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
    coachingTone: 'warm and encouraging — celebrate every correct sentence; frame corrections as simple tips, not failures',
    coachingRubric: 'Evaluate only against A1 standards. Correct present-tense sentences, basic vocabulary, and attempted communication are sufficient for a strong score. Do not penalise missing tenses or complex structures — these are not expected.',
  },

  intermediate: {
    tier: 'intermediate',
    label: 'Intermediate',
    cefr: 'A2',
    cefrTarget: 'A2',
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
    coachingTone: 'constructive and motivating — highlight what was communicated, then offer one or two clear improvements',
    coachingRubric: 'Evaluate against A2 standards. Reward any attempt at past or future tense. Note repetitive vocabulary and overly short answers as areas to improve, but do not penalise absence of complex structures.',
  },

  advanced: {
    tier: 'advanced',
    label: 'Advanced',
    cefr: 'B1',
    cefrTarget: 'B1',
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
    coachingTone: 'precise and exam-focused — reference IGCSE mark-scheme language; reward sophistication; directly name weak structures',
    coachingRubric: 'Evaluate against B1 standards. Penalise answers under 40 words, missing tense variety, repetitive vocabulary, and unsupported opinions. Reward connectors, specific vocabulary, and attempts at complex structures.',
  },

  expert: {
    tier: 'expert',
    label: 'Expert',
    cefr: 'B1+/B2',
    cefrTarget: 'B2',
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
    coachingTone: 'demanding and examiner-like — challenge vague responses, flag underdeveloped arguments, demand B2-register vocabulary; short answers are unacceptable',
    coachingRubric: 'Evaluate against B2 standards. Penalise simple sentence structures, absence of subjunctive when prompted, single-perspective answers, shallow justification, and anglicisms. A short or simple answer is a failing response, not a partial one.',
  },
};

export const DEFAULT_DIFFICULTY: DifficultyTier = 'intermediate';

export function preferredFirst(questions: Question[], difficulty: DifficultyTier): Question[] {
  const preferred = DIFFICULTY_CONFIG[difficulty].preferredQuestionDifficulty;
  const primary = questions.filter(q => preferred.includes(q.difficulty as 1 | 2 | 3));
  const secondary = questions.filter(q => !preferred.includes(q.difficulty as 1 | 2 | 3));
  return [...primary, ...secondary];
}

import type { BaseRunStats } from '../types';

export type LetterGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface GradeRubric {
  S: (s: BaseRunStats) => boolean;
  A: (s: BaseRunStats) => boolean;
  B: (s: BaseRunStats) => boolean;
  C: (s: BaseRunStats) => boolean;
}

export interface GradeStyle {
  gradeColor?: string;
  message?: string;
}

export interface GradedResult {
  grade: LetterGrade;
  accuracy: number;
  gradeColor: string;
  message?: string;
}

const DEFAULT_GRADE_STYLES: Record<LetterGrade, GradeStyle> = {
  S: { gradeColor: 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' },
  A: { gradeColor: 'text-purple-400' },
  B: { gradeColor: 'text-blue-400' },
  C: { gradeColor: 'text-emerald-400' },
  D: { gradeColor: 'text-slate-400' },
};

export const RUBRICS: {
  rapidFire: GradeRubric;
  survival: GradeRubric;
  speedSpeaking: GradeRubric;
  speakingArena: GradeRubric;
  emojiMaster: GradeRubric;
} = {
  rapidFire: {
    S: (s) => s.accuracy >= 90 && s.maxStreak >= 10 && s.totalAnswered >= 15,
    A: (s) => s.accuracy >= 80 && s.maxStreak >= 5,
    B: (s) => s.accuracy >= 65 && s.totalAnswered >= 5,
    C: (s) => s.accuracy >= 40,
  },
  survival: {
    S: (s) => s.accuracy >= 90 && (s.level ?? 0) >= 15,
    A: (s) => s.accuracy >= 80 && (s.level ?? 0) >= 8,
    B: (s) => s.accuracy >= 65 && (s.level ?? 0) >= 4,
    C: (s) => s.accuracy >= 40,
  },
  speedSpeaking: {
    S: (s) => s.accuracy >= 90 && s.maxStreak >= 10 && s.totalAnswered >= 12,
    A: (s) => s.accuracy >= 80 && s.maxStreak >= 5,
    B: (s) => s.accuracy >= 65 && s.totalAnswered >= 4,
    C: (s) => s.accuracy >= 40,
  },
  speakingArena: {
    S: (s) => s.accuracy >= 90 && (s.wave ?? 0) >= 5 && s.totalAnswered >= 20,
    A: (s) => s.accuracy >= 80 && (s.wave ?? 0) >= 3,
    B: (s) => s.accuracy >= 65 && (s.wave ?? 0) >= 2,
    C: (s) => s.accuracy >= 40,
  },
  emojiMaster: {
    S: (s) => s.accuracy >= 90 && s.maxStreak >= 8 && s.totalAnswered >= 10,
    A: (s) => s.accuracy >= 80 && s.maxStreak >= 5,
    B: (s) => s.accuracy >= 65 && s.totalAnswered >= 5,
    C: (s) => s.accuracy >= 40,
  },
};

/** Per-game style overrides (Survival uses orange S-rank). */
export const GRADE_STYLE_OVERRIDES: Partial<
  Record<keyof typeof RUBRICS, Partial<Record<LetterGrade, GradeStyle>>>
> = {
  rapidFire: {
    S: { gradeColor: 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' },
  },
  survival: {
    S: {
      gradeColor: 'text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]',
      message: 'LEGENDARY SURVIVOR!',
    },
    A: { message: 'Masterful performance!' },
    B: { message: 'Solid survival skills!' },
    C: { message: 'Keep practicing!' },
    D: { message: 'Survival is tough. Try again!' },
  },
};

function resolveStyle(
  grade: LetterGrade,
  gameKey?: keyof typeof RUBRICS
): GradeStyle {
  const base = DEFAULT_GRADE_STYLES[grade];
  const override = gameKey ? GRADE_STYLE_OVERRIDES[gameKey]?.[grade] : undefined;
  return { ...base, ...override };
}

function computeAccuracy(stats: BaseRunStats): number {
  if (stats.totalAnswered > 0) {
    return Math.round((stats.correctAnswers / stats.totalAnswered) * 100);
  }
  return stats.accuracy;
}

export function gradeFromStats(
  stats: BaseRunStats,
  rubric: GradeRubric,
  gameKey?: keyof typeof RUBRICS
): GradedResult {
  const accuracy = computeAccuracy(stats);
  const enriched: BaseRunStats = { ...stats, accuracy };

  let grade: LetterGrade = 'D';
  if (rubric.S(enriched)) grade = 'S';
  else if (rubric.A(enriched)) grade = 'A';
  else if (rubric.B(enriched)) grade = 'B';
  else if (rubric.C(enriched)) grade = 'C';

  const style = resolveStyle(grade, gameKey);
  return {
    grade,
    accuracy,
    gradeColor: style.gradeColor ?? DEFAULT_GRADE_STYLES[grade].gradeColor!,
    message: style.message,
  };
}

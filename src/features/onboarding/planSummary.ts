import type { CoachGoalType } from '../../types/coach';

/**
 * What the "Building your plan" and "You're all set" screens say, worked out
 * from the goal the learner just saved. Pure, and deliberately honest: every
 * line restates a choice they made (goal, exam date) or something the app
 * really does (the coach picks the first mission). No invented numbers, no
 * promise about a mark or a level.
 */

/** The short name of a goal as a sentence fragment: "your IGCSE French speaking". */
export function goalName(type: CoachGoalType | undefined): string {
  switch (type) {
    case 'igcse': return 'IGCSE French speaking';
    case 'gcse': return 'GCSE French speaking';
    case 'delf': return 'DELF / DALF preparation';
    case 'conversation_fluency': return 'Conversational fluency';
    case 'travel': return 'Travel French';
    case 'business': return 'Business French';
    default: return 'Everyday French speaking';
  }
}

/** Whole days from `today` to `examDate` (both YYYY-MM-DD, local days); null with no usable date. */
export function daysUntil(examDate: string | undefined, today: string): number | null {
  if (!examDate) return null;
  const to = new Date(`${examDate.slice(0, 10)}T00:00:00`).getTime();
  const from = new Date(`${today}T00:00:00`).getTime();
  if (!Number.isFinite(to) || !Number.isFinite(from)) return null;
  return Math.round((to - from) / 86_400_000);
}

export function daysToGoLabel(days: number): string {
  if (days === 0) return 'Your exam is today';
  if (days === 1) return '1 day to go';
  return `${days.toLocaleString('en-GB')} days to go`;
}

/** How long each "building" step takes to finish, and the pause on the finished list before the reveal (≈ 3 s in all). */
export const BUILD_STEP_MS = 650;
export const BUILD_HOLD_MS = 450;

export interface BuildStep {
  id: 'goal' | 'rhythm' | 'coach' | 'mission';
  /** While it is being done, and once it is. */
  working: string;
  done: string;
}

export interface PlanInput {
  goalType: CoachGoalType | undefined;
  examDate: string | undefined;
  today: string;
}

/** The four things "built" while the learner watches — each one a true statement about their plan. */
export function buildSteps({ goalType, examDate, today }: PlanInput): BuildStep[] {
  const days = daysUntil(examDate, today);
  const hasDate = days !== null && days >= 0;
  return [
    {
      id: 'goal',
      working: 'Setting your goal',
      done: `Goal set: ${goalName(goalType)}`,
    },
    {
      id: 'rhythm',
      working: hasDate ? 'Counting down to your exam' : 'Choosing a steady rhythm',
      done: hasDate ? daysToGoLabel(days) : 'A steady daily rhythm, no deadline',
    },
    {
      id: 'coach',
      working: 'Tuning your coach',
      done: 'Coach tuned to your goal',
    },
    {
      id: 'mission',
      working: 'Preparing your first mission',
      done: 'Your first mission is ready',
    },
  ];
}

export interface PathStep {
  n: 1 | 2 | 3;
  title: string;
  detail: string;
}

/** The road ahead on the "all set" screen: where they are, and what comes next. */
export const PATH_STEPS: readonly PathStep[] = [
  { n: 1, title: 'Find your level', detail: 'Five short questions out loud. About 3 minutes, no marks.' },
  { n: 2, title: 'Do your first mission', detail: 'Your coach has picked it for you.' },
  { n: 3, title: 'Start your streak', detail: 'Practise once a day and watch it grow.' },
];

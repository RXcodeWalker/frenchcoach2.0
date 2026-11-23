/**
 * Pronunciation Lab — "Today's 5 minutes". Pure.
 *
 * The Lab home used to hand a new learner three equal cards and ten grey chips
 * and ask them to decide. This builds one short, ordered plan from what the
 * Lab already knows (the local history), so the first tap is never a decision:
 *
 *   1. Tricky words that are due today (only when there are some),
 *   2. one sentence — with the learner's weakest sound in it when that is known,
 *   3. one ear-training round on the same sound (or on all of them).
 *
 * The plan reads the history and nothing else; it keeps no state of its own,
 * writes nothing and sends nothing. "Done" is held by the screen for the
 * sitting only.
 */

import type { LabHistory } from './labHistory';
import { soundProgress } from './soundProgress';
import { SOUND_TIPS } from './tips';
import { trickyDeck } from './trickyWords';
import type { SoundFamilyId } from './types';

export type PlanStepKind = 'tricky' | 'sentence' | 'ear';

export interface PlanStep {
  kind: PlanStepKind;
  /** The sound this step is about; null when no sound has been named yet. */
  family: SoundFamilyId | null;
  title: string;
  note: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function buildTodayPlan(history: LabHistory, today: string): PlanStep[] {
  const steps: PlanStep[] = [];
  const due = trickyDeck(history.words, today).filter((d) => d.due).length;
  if (due > 0) {
    steps.push({
      kind: 'tricky',
      family: null,
      title: 'Your tricky words',
      note: `${due} ${plural(due, 'word', 'words')} waiting — say each one again`,
    });
  }

  const weakest = soundProgress(history.observations).workOn[0] ?? null;
  steps.push({
    kind: 'sentence',
    family: weakest,
    title: 'Say one sentence',
    note: weakest ? `One with ${SOUND_TIPS[weakest].name} in it` : 'Listen, say it, compare',
  });
  steps.push({
    kind: 'ear',
    family: weakest,
    title: 'One round of ear training',
    note: weakest ? `Hearing ${SOUND_TIPS[weakest].name}` : 'Which word did you hear? No recording',
  });
  return steps;
}

/** "About 5 minutes" is honest for the whole plan; each step is a couple of minutes at most. */
export const TODAY_TITLE = 'Today’s 5 minutes';
export const TODAY_INTRO = 'A short plan made from what you’ve practised. Do them in order, or pick one.';

/** The line on the finished plan; never a score. */
export function todayDoneLine(done: number, total: number): string {
  if (done >= total) return 'That’s today’s practice done. Come back tomorrow for the next one.';
  return `${done} of ${total} done.`;
}

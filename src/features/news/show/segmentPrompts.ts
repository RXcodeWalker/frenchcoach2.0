/**
 * A segment's turns, built from the bank — docs/systems/daily-news.md §7. Pure.
 * Each turn carries its model answer for the review.
 */
import type { InterviewKind, NewsLevel, NewsPrompt } from '../../../data/news/types';
import type { SegmentId } from './showPlan';
import type { TurnPrompt } from './segments/SegmentTurns';
import type { CheckableTurn, Habit } from './answerReview';

export interface SegmentTurn extends TurnPrompt, CheckableTurn {
  model: string;
  /** What the review calls the model ("A model answer" unless said). */
  modelLabel?: string;
  /** Henri's line once the learner has answered (an interview with a fact sheet). */
  reaction?: NewsPrompt;
}

const HABIT: Record<InterviewKind, Habit | undefined> = {
  describe: undefined,
  past: 'past',
  future: 'future',
  opinion: 'reason',
};

export function segmentTurns(level: NewsLevel, segment: SegmentId): SegmentTurn[] {
  if (segment === 'interview') {
    const { questions: qs, factSheet } = level.interview;
    return qs.map((q, i) => ({
      key: `interview-${i}`,
      eyebrow: `Question ${i + 1} of ${qs.length}`,
      fr: q.fr,
      en: q.en,
      starters: q.starters,
      speak: true,
      model: q.model,
      habit: HABIT[q.kind],
      fact: q.fact ? factSheet?.find(f => f.id === q.fact) : undefined,
      sheet: factSheet,
      reaction: q.reaction,
    }));
  }
  if (segment === 'journalist') {
    const ts = level.journalist.targets;
    return ts.map((t, i) => ({
      key: `journalist-${i}`,
      eyebrow: `Goal ${i + 1} of ${ts.length}`,
      goal: t.goal,
      fr: '',
      en: '',
      // No starters: choosing the question word is the task.
      starters: [],
      speak: false,
      model: t.question,
      modelLabel: 'A question that works',
    }));
  }
  if (segment === 'predict') {
    const p = level.predict;
    return [
      { key: 'predict-next', eyebrow: 'What happens next?', fr: p.next.fr, en: p.next.en, starters: p.next.starters, speak: true, model: p.next.model, habit: 'future' },
      { key: 'predict-if-you', eyebrow: 'And you?', fr: p.ifYou.fr, en: p.ifYou.en, starters: p.ifYou.starters, speak: true, model: p.ifYou.model, habit: 'future' },
    ];
  }
  const d = level.debate;
  return [
    { key: 'debate-for', eyebrow: 'Argue for', fr: d.motion.fr, en: `${d.motion.en} Say yes, and give a reason.`, starters: d.for.starters, speak: true, model: d.for.model, habit: 'reason' },
    { key: 'debate-against', eyebrow: 'Now argue against', fr: d.motion.fr, en: `${d.motion.en} Now say no, and give a reason.`, starters: d.against.starters, speak: false, model: d.against.model, habit: 'reason' },
  ];
}

import type { FeedbackV2 } from '../../../types';
import { FIRST_FIXES, whatWorkedGroup } from '../../feedback/coachPoints';
import { FeedbackPointList, type FeedbackPointGroup } from '../../feedback/components/FeedbackPointList';
import type { Fix } from './answerReview';

interface Props {
  feedback: FeedbackV2;
  /** Fixes that quote no single answer (answerReview.placeFixes); the rest are shown under each answer. */
  unplaced: readonly Fix[];
  /** How many fixes were placed under the answers. */
  placedCount: number;
}

/**
 * The overall part of a news segment's feedback, with no marks (daily-news §8):
 * the coach's opening line, what worked, and any fix that belongs to no single
 * answer. The fixes and "Say it better" for each answer are in YourAnswers. It
 * never reads `scores` or `cefrLevel` — this is not a topic-marked answer, so
 * no number, criterion or level is shown (a test holds it to that).
 */
export function NewsCoachFeedback({ feedback, unplaced, placedCount }: Props) {
  const worked = whatWorkedGroup(feedback);
  const groups: FeedbackPointGroup[] = [];
  if (worked.points.length > 0) groups.push(worked);
  if (unplaced.length > 0) groups.push({ heading: 'Worth fixing', tone: 'bad', points: unplaced.slice(0, FIRST_FIXES) });

  return (
    <div className="flex flex-col gap-3" data-testid="news-coach-feedback">
      {feedback.encouragement && <p className="text-body-s text-ink">{feedback.encouragement}</p>}
      {groups.length > 0 && <FeedbackPointList groups={groups} />}
      {placedCount > 0 && (
        <p className="text-body-s text-ink-muted">Your fixes are under each answer below, with a better way to say it.</p>
      )}
    </div>
  );
}

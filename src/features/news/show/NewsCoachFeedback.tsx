import type { FeedbackV2 } from '../../../types';
import { FIRST_FIXES, FIX_FIRST_HEADING, selectCoachFixes, whatWorkedGroup } from '../../feedback/coachPoints';
import { FeedbackPointList, type FeedbackPointGroup } from '../../feedback/components/FeedbackPointList';
import { BeforeAfterDiff } from '../../feedback/components/BeforeAfterDiff';

interface Props {
  feedback: FeedbackV2;
  /** The learner's answers, joined — what the improved version is compared with. */
  transcript: string;
}

/**
 * Feedback on a news segment, with no marks (daily-news §8): what worked, the
 * one or two things to fix first, and the improved version. It never reads
 * `scores` or `cefrLevel` — this is not a topic-marked answer, so no number,
 * criterion or level is shown (a test holds it to that).
 */
export function NewsCoachFeedback({ feedback, transcript }: Props) {
  const worked = whatWorkedGroup(feedback);
  const fixes = selectCoachFixes(feedback).slice(0, FIRST_FIXES);
  const groups: FeedbackPointGroup[] = [];
  if (worked.points.length > 0) groups.push(worked);
  if (fixes.length > 0) groups.push({ heading: FIX_FIRST_HEADING, tone: 'bad', points: fixes });

  return (
    <div className="flex flex-col gap-3" data-testid="news-coach-feedback">
      {feedback.encouragement && <p className="text-body-s text-ink">{feedback.encouragement}</p>}
      {groups.length > 0 && <FeedbackPointList groups={groups} />}
      <BeforeAfterDiff transcript={transcript} improvedAnswer={feedback.improved_answer} title="Say it better" />
    </div>
  );
}

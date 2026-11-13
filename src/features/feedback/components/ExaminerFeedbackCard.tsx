import { GraduationCap, Loader2 } from 'lucide-react';
import {
  isExaminerFeedbackEmpty,
  type ExaminerFailureKind,
  type ExaminerFeedback,
  type ExaminerTurnKind,
} from '../../../services/coaching/examinerFeedback';
import { examinerGroups } from './examinerGroups';
import { FeedbackPointList } from './FeedbackPointList';
import { SHORT_ANSWER_NOTES } from './shortAnswerNotes';

interface Props {
  /**
   * 'quota-exhausted': today's AI feedback allowance is used up (HTTP 429) — no retry offered.
   * 'skipped': the answer was silent, so no call was made (the rail's tier gate).
   */
  status: 'pending' | 'done' | 'failed' | 'quota-exhausted' | 'skipped';
  result: ExaminerFeedback | null;
  /** Why a 'failed' card failed; defaults to 'ungrounded'. */
  failureKind?: ExaminerFailureKind;
  onSwitchToCoach: () => void;
  onRetry: () => void;
  /** Exam mode has no "coach mode" to switch to — hides that escape hatch on the failed state. */
  hideSwitchToCoach?: boolean;
  /**
   * 'compact' is for the live corrections rail and the results replay: same
   * content and the same pending / failed / quota states, tighter layout, and
   * no header or descriptor line. It is a prop, not a second component.
   */
  variant?: 'full' | 'compact';
  /** The quote the learner clicked in the transcript; its row is highlighted. */
  highlightedQuote?: string | null;
  /**
   * Set for a 1–3-word rail answer (the part it was in): adds a "develop your
   * answer" note, so a short answer always gets commentary even when the
   * model found nothing it could quote. Practice advice only — never a mark.
   */
  shortAnswer?: ExaminerTurnKind;
}

function ShortAnswerNote({ kind }: { kind: ExaminerTurnKind }) {
  return (
    <div className="rounded-xl surface-raised p-3 space-y-1">
      <p className="text-xs font-bold text-ink">Develop your answer</p>
      <p className="text-xs text-ink-muted">{SHORT_ANSWER_NOTES[kind]}</p>
    </div>
  );
}

/**
 * Renders examiner-voice practice commentary: what worked, the mistakes to
 * fix (quote → correction · category) and one next step, every claim
 * quote-verified against the transcript, NO mark/band/total anywhere
 * ("practice feedback in examiner language, not a grade prediction"). Its own
 * component, not a FeedbackV2-shaped card — that type always carries a numeric
 * score, and this mode must never fabricate one.
 */
export function ExaminerFeedbackCard({
  status,
  result,
  failureKind = 'ungrounded',
  onSwitchToCoach,
  onRetry,
  hideSwitchToCoach,
  variant = 'full',
  highlightedQuote,
  shortAnswer,
}: Props) {
  const compact = variant === 'compact';
  const stateBox = compact ? 'rounded-xl surface-raised p-4' : 'rounded-xl surface-raised p-6';

  if (status === 'pending') {
    return (
      <div className={`${compact ? 'rounded-xl surface-raised p-4' : 'rounded-xl surface-raised p-8'} flex flex-col items-center gap-3`}>
        <Loader2 size={compact ? 18 : 24} className="text-reward-text animate-spin" />
        <p className="text-sm text-ink-muted">Preparing examiner commentary…</p>
      </div>
    );
  }

  if (status === 'quota-exhausted') {
    return (
      <div className={`${stateBox} space-y-2 text-center`}>
        <p className="text-sm text-ink-muted font-semibold">You've used today's AI feedback allowance.</p>
        <p className="text-xs text-ink-muted">It resets at midnight India time.</p>
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div className={`${stateBox} space-y-1 text-center`}>
        <p className="text-sm text-ink-muted font-semibold">No commentary for this answer.</p>
        <p className="text-xs text-ink-muted">Nothing was heard, so there is nothing to comment on.</p>
      </div>
    );
  }

  // A short answer the model could not quote from still gets its note, not a failure.
  if (shortAnswer && status === 'failed' && failureKind === 'ungrounded') {
    return <ShortAnswerNote kind={shortAnswer} />;
  }

  if (status === 'failed' || !result) {
    const unavailable = failureKind === 'unavailable';
    return (
      <div className={`${stateBox} space-y-3 text-center`}>
        <p className="text-sm text-ink-muted font-semibold">
          {unavailable
            ? 'Examiner commentary is unavailable right now.'
            : "Couldn't produce evidence-backed examiner feedback for this answer."}
        </p>
        <p className="text-xs text-ink-muted">
          {unavailable
            ? 'The feedback service is busy. Wait a moment, then try again.'
            : 'This can happen when an answer is too short to quote from directly.'}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl surface-recessed text-xs font-bold text-ink-muted hover:bg-white/5 transition-colors"
          >
            Try again
          </button>
          {!hideSwitchToCoach && (
            <button
              type="button"
              onClick={onSwitchToCoach}
              className="px-4 py-2 rounded-xl bg-action-soft border border-hairline text-action-text text-xs font-bold hover:bg-violet-500/25 transition-colors"
            >
              Switch to coach mode
            </button>
          )}
        </div>
      </div>
    );
  }

  const isEmpty = isExaminerFeedbackEmpty(result);
  const emptyMessage =
    result.profile === 'rail' && result.turnKind === 'topic'
      ? 'No clear mistakes to fix in this answer.'
      : 'No examiner commentary for this answer.';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center gap-2 px-1">
          <GraduationCap size={14} className="text-reward-text" />
          <p className="text-[11px] font-bold text-ink-muted">Examiner commentary</p>
          <span className="text-[9px] text-ink-muted ml-auto">Practice feedback — not a grade prediction</span>
        </div>
      )}

      <FeedbackPointList groups={examinerGroups(result, compact)} compact={compact} highlightedQuote={highlightedQuote} />

      {isEmpty && !shortAnswer && <p className="text-xs text-ink-muted text-center py-4">{emptyMessage}</p>}
      {shortAnswer && <ShortAnswerNote kind={shortAnswer} />}
    </div>
  );
}

import { Flame, X } from 'lucide-react';
import { averageRealScores, scoreFill } from '../../domain/scoring';
import { shownBestScore } from '../../features/learn/markingLevel';
import { TopicChip } from '../../components/ui/TopicChip';
import type { ActiveSession } from '../../types';

interface Props {
  session: ActiveSession;
  topicLabel: string;
  /** The topic key, for its icon chip. */
  topicKey: string;
  onEndSession: () => void;
  /** Mobile: the counter and segments share one row; no topic name. */
  compact?: boolean;
}

/**
 * The session header (Design System v2): topic chip and name, "Q n/N", the
 * running average and XP, an end-session button, and a 6px segmented bar —
 * one segment per question. Completed segments take an honest score tint
 * (progress/reward/correction, or --ink-subtle when every attempt on that
 * question was unscored — never a fabricated colour from a placeholder 0);
 * the current one is outlined in --action.
 */
export function SessionProgressBar({ session, topicLabel, topicKey, onEndSession, compact = false }: Props) {
  const { currentIndex, targetCount, answerStreak, xpAccumulated } = session;
  const questionNumber = Math.min(currentIndex + 1, targetCount);

  const completedScores = session.questions
    .filter(q => q.status === 'completed')
    .map(shownBestScore);
  const avgScore = averageRealScores(completedScores);

  const segments = (
    <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
      {Array.from({ length: targetCount }, (_, i) => {
        const q = session.questions[i];
        const isCompleted = q?.status === 'completed';
        const isActive = i === currentIndex && !isCompleted;
        const score = q ? shownBestScore(q) : null;
        const background = isCompleted
          ? score == null ? 'var(--ink-subtle)' : scoreFill(score)
          : isActive ? 'transparent' : 'var(--track)';
        return (
          <span
            key={i}
            className="flex-1 rounded-pill transition-colors duration-state ease-smooth"
            style={{ background, boxShadow: isActive ? 'inset 0 0 0 1.5px var(--action)' : 'none' }}
          />
        );
      })}
    </div>
  );

  const counter = (
    <span className="whitespace-nowrap font-numeral text-[13px] text-ink" aria-label={`Question ${questionNumber} of ${targetCount}`}>
      Q{questionNumber}/{targetCount}
    </span>
  );

  const extras = (
    <>
      {avgScore !== null && !compact && (
        <span className="whitespace-nowrap font-numeral text-caption text-ink-muted">avg {avgScore.toFixed(1)}</span>
      )}
      {answerStreak >= 3 && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap font-numeral text-caption text-streak-text">
          <Flame size={14} aria-hidden="true" />{answerStreak}
        </span>
      )}
      {xpAccumulated > 0 && (
        <span className="whitespace-nowrap font-numeral text-caption text-reward-text">+{xpAccumulated} XP</span>
      )}
      <button
        type="button"
        onClick={onEndSession}
        aria-label="End session early"
        title="End session early"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
      >
        <X size={16} />
      </button>
    </>
  );

  if (compact) {
    return (
      <div className="flex w-full items-center gap-3">
        {counter}
        {segments}
        {extras}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <TopicChip topicKey={topicKey} size={20} />
        <span className="truncate text-[13px] font-semibold text-ink-muted">{topicLabel}</span>
        {counter}
        <span className="flex-1" />
        {extras}
      </div>
      <div className="flex">{segments}</div>
    </div>
  );
}

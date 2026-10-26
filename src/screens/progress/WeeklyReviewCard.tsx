import { motion } from 'framer-motion';
import { CalendarDays, X } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { WeeklyReview } from '../../types/coach';

interface WeeklyReviewCardProps {
  review: WeeklyReview | null | undefined;
  onDismiss?: () => void;
}

function trendChip(trend: WeeklyReview['confidenceTrend']) {
  if (trend === 'rising') return { label: 'Rising', className: 'bg-progress-soft text-progress-text' };
  if (trend === 'falling') return { label: 'Falling', className: 'bg-reward-soft text-reward-text' };
  if (trend === 'stable') return { label: 'Stable', className: 'bg-info-soft text-info-text' };
  return { label: 'Not enough data', className: 'bg-surface-recessed text-ink-subtle' };
}

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Home's weekly-review banner. Renders nothing until a review has been generated. */
export function WeeklyReviewCard({ review, onDismiss }: WeeklyReviewCardProps) {
  if (!review) return null;
  const chip = trendChip(review.confidenceTrend);
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <CalendarDays size={14} className="shrink-0 text-ink-subtle" aria-hidden="true" />
          <span className="text-eyebrow uppercase text-ink-subtle">Weekly review</span>
          <span className="font-numeral text-caption text-ink-subtle">{formatDateRange(review.periodStart, review.periodEnd)}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss weekly review"
          className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-body-s text-ink-muted line-clamp-2">{review.tutorSummary}</p>
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-muted">
        <span><span className="font-numeral text-ink">{review.sessionsCompleted}</span> sessions</span>
        <span><span className="font-numeral text-ink">~{review.totalMinutes}</span> min</span>
        <span className={`inline-flex h-6 items-center rounded-pill px-2 text-caption font-semibold ${chip.className}`}>{chip.label}</span>
      </div>
    </motion.div>
  );
}

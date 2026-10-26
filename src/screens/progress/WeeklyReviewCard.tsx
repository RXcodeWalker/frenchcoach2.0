import { motion } from 'framer-motion';
import { X, CalendarDays } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { WeeklyReview } from '../../types/coach';

interface WeeklyReviewCardProps {
  review: WeeklyReview | null | undefined;
  onDismiss?: () => void;
}

function trendColor(trend: WeeklyReview['confidenceTrend']) {
  if (trend === 'rising') return 'border-l-emerald-500 bg-emerald-500/5';
  if (trend === 'falling') return 'border-l-amber-500 bg-amber-500/5';
  if (trend === 'stable') return 'border-l-blue-500 bg-blue-500/5';
  return 'border-l-slate-500 bg-slate-500/5';
}

function trendChip(trend: WeeklyReview['confidenceTrend']) {
  if (trend === 'rising') return { label: 'Rising ↑', className: 'bg-emerald-500/15 text-emerald-400' };
  if (trend === 'falling') return { label: 'Falling ↓', className: 'bg-amber-500/15 text-amber-400' };
  if (trend === 'stable') return { label: 'Stable →', className: 'bg-blue-500/15 text-blue-400' };
  return { label: 'Unknown', className: 'bg-slate-500/15 text-ink-muted' };
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
    <motion.div
      variants={fadeUp}
      className={`surface border-l-4 rounded-2xl p-4 ${trendColor(review.confidenceTrend)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays size={14} className="text-ink-muted shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">Weekly Review</span>
          <span className="text-[9px] text-ink-subtle">{formatDateRange(review.periodStart, review.periodEnd)}</span>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-ink-muted hover:text-white"
        >
          <X size={12} />
        </button>
      </div>

      <p className="text-sm text-ink-muted mt-2 line-clamp-2">{review.tutorSummary}</p>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="text-[10px] text-ink-muted">
          <span className="text-white font-bold">{review.sessionsCompleted}</span> sessions
        </span>
        <span className="text-[10px] text-ink-muted">
          <span className="text-white font-bold">~{review.totalMinutes}</span> min
        </span>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip.className}`}>{chip.label}</span>
      </div>
    </motion.div>
  );
}

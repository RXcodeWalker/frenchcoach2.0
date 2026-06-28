import { motion } from 'framer-motion';
import { X, CalendarDays, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';
import type { WeeklyReview } from '../../types/coach';

interface WeeklyReviewCardProps {
  review: WeeklyReview | null | undefined;
  variant: 'banner' | 'full';
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
  return { label: 'Unknown', className: 'bg-slate-500/15 text-slate-400' };
}

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function DeltaBar({ before, after, delta }: { before: number; after: number; delta: number }) {
  const pct = Math.round(Math.abs(delta) * 100);
  const isUp = delta > 0;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-slate-500 w-5 text-right">{Math.round(before * 100)}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isUp ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, Math.max(4, pct * 2))}%` }}
        />
      </div>
      <span className="text-slate-500 w-5">{Math.round(after * 100)}%</span>
      <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-amber-400'}`}>
        {isUp ? '+' : ''}{Math.round(delta * 100)}%
      </span>
    </div>
  );
}

export function WeeklyReviewCard({ review, variant, onDismiss }: WeeklyReviewCardProps) {
  const navigate = useNavigate();

  if (variant === 'banner') {
    if (!review) return null;
    const chip = trendChip(review.confidenceTrend);
    return (
      <motion.div
        variants={fadeUp}
        className={`glass border-l-4 rounded-2xl p-4 ${trendColor(review.confidenceTrend)}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weekly Review</span>
            <span className="text-[9px] text-slate-600">{formatDateRange(review.periodStart, review.periodEnd)}</span>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-slate-500 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>

        <p className="text-sm text-slate-300 mt-2 line-clamp-2">{review.tutorSummary}</p>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-[10px] text-slate-500">
            <span className="text-white font-bold">{review.sessionsCompleted}</span> sessions
          </span>
          <span className="text-[10px] text-slate-500">
            <span className="text-white font-bold">~{review.totalMinutes}</span> min
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip.className}`}>{chip.label}</span>
          <button
            onClick={() => navigate('/progress?tab=review')}
            className="ml-auto text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            See full review →
          </button>
        </div>
      </motion.div>
    );
  }

  // Full variant
  if (!review) {
    return (
      <motion.div variants={fadeUp} className="rounded-xl glass p-8 text-center">
        <CalendarDays size={32} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No weekly review yet</p>
        <p className="text-slate-600 text-sm mt-1">Complete a session to get your first weekly summary.</p>
      </motion.div>
    );
  }

  const chip = trendChip(review.confidenceTrend);

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div variants={fadeUp} className="rounded-xl glass p-4 flex items-center gap-3 flex-wrap">
        <CalendarDays size={16} className="text-violet-400 shrink-0" />
        <div>
          <p className="text-white font-bold text-sm">{formatDateRange(review.periodStart, review.periodEnd)}</p>
          <p className="text-[10px] text-slate-500">Generated {new Date(review.generatedAt).toLocaleDateString()}</p>
        </div>
        <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${chip.className}`}>{chip.label}</span>
      </motion.div>

      {/* Stats strip */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl glass p-3.5">
          <p className="text-lg font-black text-white">{review.sessionsCompleted}</p>
          <p className="text-[9px] text-slate-600 font-medium">Sessions</p>
        </div>
        <div className="rounded-xl glass p-3.5">
          <p className="text-lg font-black text-white">~{review.totalMinutes}</p>
          <p className="text-[9px] text-slate-600 font-medium">Minutes</p>
        </div>
      </motion.div>

      {/* Tutor summary */}
      <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5 border-l-4 border-l-violet-500">
        <p className="text-sm text-slate-300 italic leading-relaxed">"{review.tutorSummary}"</p>
      </motion.div>

      {/* Week focus */}
      {review.weekFocusPriorities.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-violet-400" />
            <h3 className="font-bold text-white text-sm">This Week's Focus</h3>
          </div>
          <ol className="space-y-2">
            {review.weekFocusPriorities.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* Skill movements */}
      {(review.improved.length > 0 || review.slipping.length > 0) && (
        <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Skill Movements</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {review.improved.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Improving</span>
                </div>
                <div className="space-y-2.5">
                  {review.improved.map(m => (
                    <div key={m.skillId}>
                      <p className="text-[11px] text-slate-300 mb-1">{m.label}</p>
                      <DeltaBar before={m.before} after={m.after} delta={m.delta} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {review.slipping.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown size={12} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Watch</span>
                </div>
                <div className="space-y-2.5">
                  {review.slipping.map(m => (
                    <div key={m.skillId}>
                      <p className="text-[11px] text-slate-300 mb-1">{m.label}</p>
                      <DeltaBar before={m.before} after={m.after} delta={m.delta} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {review.improved.length === 0 && review.slipping.length === 0 && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Minus size={14} />
                No significant skill changes this week.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Exam readiness */}
      {review.examReadiness && (
        <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            {review.examReadiness.readinessLevel === 'on_track'
              ? <CheckCircle size={14} className="text-emerald-400" />
              : <AlertTriangle size={14} className="text-amber-400" />}
            <h3 className="font-bold text-white text-sm">Exam Readiness</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-black text-white">{review.examReadiness.predictedScore}</p>
              <p className="text-[10px] text-slate-500">Predicted Score</p>
              <p className="text-[9px] text-slate-600">{review.examReadiness.confidenceInterval[0]}–{review.examReadiness.confidenceInterval[1]}</p>
            </div>
            <div className="flex-1">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                review.examReadiness.readinessLevel === 'on_track' ? 'bg-emerald-500/15 text-emerald-400' :
                review.examReadiness.readinessLevel === 'at_risk' ? 'bg-amber-500/15 text-amber-400' :
                'bg-red-500/15 text-red-400'
              }`}>
                {review.examReadiness.readinessLevel.replace('_', ' ')}
              </span>
              {review.examReadiness.topRisks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {review.examReadiness.topRisks.map((r, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

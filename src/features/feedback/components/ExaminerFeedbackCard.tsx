import { GraduationCap, Loader2 } from 'lucide-react';
import type { ExaminerFeedback } from '../../../services/coaching/examinerFeedback';

interface Props {
  status: 'pending' | 'done' | 'failed';
  result: ExaminerFeedback | null;
  onSwitchToCoach: () => void;
  onRetry: () => void;
}

/**
 * Renders examiner-voice practice commentary: real Cambridge 0520 descriptor
 * language, every claim quote-verified against the transcript, NO mark/band/
 * total anywhere (roadmap.md S10 framing — "practice feedback in examiner
 * language, not a grade prediction"). Deliberately its own component, not a
 * FeedbackV2-shaped card — that type always carries a numeric score, and this
 * mode must never fabricate one.
 */
export function ExaminerFeedbackCard({ status, result, onSwitchToCoach, onRetry }: Props) {
  if (status === 'pending') {
    return (
      <div className="rounded-xl glass-elevated p-8 flex flex-col items-center gap-3">
        <Loader2 size={24} className="text-amber-400 animate-spin" />
        <p className="text-sm text-slate-500">Preparing examiner commentary…</p>
      </div>
    );
  }

  if (status === 'failed' || !result) {
    return (
      <div className="rounded-xl glass-elevated p-6 space-y-3 text-center">
        <p className="text-sm text-slate-300 font-semibold">
          Couldn't produce evidence-backed examiner feedback for this answer.
        </p>
        <p className="text-xs text-slate-500">
          This can happen when an answer is too short to quote from directly.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl glass-subtle text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onSwitchToCoach}
            className="px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-colors"
          >
            Switch to coach mode
          </button>
        </div>
      </div>
    );
  }

  const hasContent = result.currentDescriptorCommentary.length > 0 || result.improvementCommentary.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <GraduationCap size={14} className="text-amber-400" />
        <p className="text-[11px] font-bold text-slate-300">Examiner commentary</p>
        <span className="text-[9px] text-slate-500 ml-auto">Practice feedback — not a grade prediction</span>
      </div>

      {result.currentDescriptorCommentary.length > 0 && (
        <div className="rounded-xl glass-elevated p-4 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">What this answer currently shows</p>
          {result.currentDescriptorCommentary.map((c, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-slate-200 leading-relaxed">{c.claim}</p>
              <p className="text-[11px] text-amber-300/80 italic">« {c.quote} »</p>
            </div>
          ))}
        </div>
      )}

      {result.improvementCommentary.length > 0 && (
        <div className="rounded-xl glass-elevated p-4 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">What would move this up a band</p>
          {result.improvementCommentary.map((c, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-slate-200 leading-relaxed">{c.claim}</p>
              <p className="text-[11px] text-amber-300/80 italic">« {c.quote} »</p>
            </div>
          ))}
        </div>
      )}

      {!hasContent && (
        <p className="text-xs text-slate-500 text-center py-4">No examiner commentary for this answer.</p>
      )}
    </div>
  );
}

import { motion } from 'framer-motion';
import { ChevronRight, XCircle, CheckCircle, RotateCcw, Loader2 } from 'lucide-react';
import { scoreColor } from '../../domain/scoring';
import type { Feedback } from '../../types';

interface Props {
  feedback: Feedback | null;
  isLoading?: boolean;
  onRetry: () => void;
  onComplete: () => void;
}

export function FeedbackPanel({ feedback, isLoading, onRetry, onComplete }: Props) {
  if (isLoading || !feedback) {
    return (
      <motion.div
        className="rounded-xl glass-elevated p-8 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Loader2 size={24} className="text-violet-400 animate-spin" />
        <p className="text-sm text-slate-500">Analysing your response…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-xl glass-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm">Results</h3>
          <span className="text-[9px] text-slate-600">{feedback.wordCount} words / {feedback.cefrLevel}</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries({ Comm: feedback.scores.communication, Lang: feedback.scores.language, Fluency: feedback.scores.fluency, Overall: feedback.scores.overall }).map(([label, val]) => (
            <div key={label} className="text-center">
              <motion.div
                className="text-xl font-black mb-1"
                style={{ color: scoreColor(val) }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                {val.toFixed(1)}
              </motion.div>
              <div className="text-[9px] text-slate-600">{label}</div>
              <div className="mt-1.5 h-1 bg-navy-300 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full shimmer-bar"
                  style={{ background: scoreColor(val) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(val / 10) * 100}%` }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {feedback.grammar.critical.length > 0 && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Corrections</p>
          {feedback.grammar.critical.map((err, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 mb-1.5">
              <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-red-300">{err.theme}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{err.diagnostic}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5"><CheckCircle size={9} className="inline mr-1" />{err.correction}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {feedback.vocabulary.length > 0 && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Vocabulary Upgrades</p>
          {feedback.vocabulary.map((v, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-subtle mb-1">
              <span className="text-[10px] text-slate-600 line-through">{v.basic}</span>
              <ChevronRight size={9} className="text-slate-700" />
              <span className="text-[10px] text-emerald-400 font-medium">{v.upgrade}</span>
            </div>
          ))}
        </div>
      )}

      {feedback.style.length > 0 && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Style Tips</p>
          {feedback.style.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg glass-subtle mb-1">
              <span className="text-[10px] font-semibold text-violet-300">{s.label}</span>
              <span className="text-[10px] text-slate-500">{s.suggestion}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <motion.button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs"
          whileTap={{ scale: 0.97 }}
        >
          <RotateCcw size={12} /> Retry
        </motion.button>
        <motion.button
          onClick={onComplete}
          className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          Next Question <ChevronRight size={13} />
        </motion.button>
      </div>
    </motion.div>
  );
}

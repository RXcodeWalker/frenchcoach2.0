import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import type { MistakeLog } from '../../types';

interface MistakeLogViewerProps {
  mistakes: MistakeLog[];
}

export const MistakeLogViewer: React.FC<MistakeLogViewerProps> = ({ mistakes }) => {
  if (!mistakes || mistakes.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-ink-muted italic">No specific mistakes logged yet. Keep practicing!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {mistakes.map((log, index) => (
        <motion.div
          key={`${log.timestamp}-${index}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-navy/40 border border-white/5 rounded-xl p-3 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
            <div className="flex items-center gap-1.5 text-[8px] font-black text-ink-muted uppercase tracking-widest">
              <Calendar size={10} />
              {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
            {log.transcript === '[AVOIDED]' && (
              <span className="text-[8px] font-black bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                Avoidance Detected
              </span>
            )}
          </div>

          <div className="space-y-3">
            {log.transcript !== '[AVOIDED]' && log.transcript && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-400 uppercase tracking-tighter">
                  <AlertCircle size={10} />
                  What you said
                </div>
                <p className="text-xs text-ink-muted italic leading-relaxed pl-4 border-l border-rose-500/30">
                  "{log.transcript}"
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">
                <CheckCircle2 size={10} />
                Correction / Suggestion
              </div>
              <p className="text-xs text-white font-medium leading-relaxed pl-4 border-l border-emerald-500/30">
                {log.corrected}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import type { AIEngine } from '../../types';

const ENGINE_LABEL: Record<AIEngine, string> = { gemini: 'Gemini', groq: 'Groq', offline: 'Offline' };

interface Props {
  show: boolean;
  requestedEngine: AIEngine;
  actualEngine: AIEngine;
  reason?: string;
  onDismiss: () => void;
}

export function FailoverToast({ show, requestedEngine, actualEngine, reason, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="fixed top-16 right-4 z-50 max-w-xs w-full"
        >
          <div className="rounded-2xl glass-elevated border border-amber-400/20 p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center">
                <AlertTriangle size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-300">
                  {ENGINE_LABEL[requestedEngine]} unavailable
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {reason
                    ? `${reason}. `
                    : `${ENGINE_LABEL[requestedEngine]} could not be reached. `}
                  Your answer was evaluated using{' '}
                  <span className="text-white font-semibold">{ENGINE_LABEL[actualEngine]}</span> instead.
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, CheckCircle } from 'lucide-react';
import type { CoachingIssue } from '../../../types';
import { SEVERITY_COLOR } from '../theme/severity';
import { SeverityBadge } from '../../../components/ui/SeverityBadge';

interface Props {
  issue: CoachingIssue;
  onClose: () => void;
}

export function CoachingPopover({ issue, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key={issue.id}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="relative rounded-xl surface-raised border border-slate-700/50 p-4 shadow-xl z-10"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-subtle hover:text-ink-muted"
          aria-label="Close"
        >
          <X size={12} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <SeverityBadge level={issue.severity} />
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{issue.category}</span>
        </div>

        <p
          className="text-[11px] font-mono px-2 py-1 rounded mb-2"
          style={{ color: SEVERITY_COLOR[issue.severity], background: `${SEVERITY_COLOR[issue.severity]}15` }}
        >
          "{issue.quote}"
        </p>

        <p className="text-[10px] text-ink-muted mb-2">{issue.diagnostic}</p>

        <div className="flex items-center gap-1.5 text-[10px]">
          <CheckCircle size={10} className="text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-300 font-medium">{issue.correction}</span>
        </div>

        {issue.stronger && (
          <div className="flex items-center gap-1.5 text-[10px] mt-1">
            <ChevronRight size={10} className="text-violet-400 flex-shrink-0" />
            <span className="text-violet-300">{issue.stronger}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

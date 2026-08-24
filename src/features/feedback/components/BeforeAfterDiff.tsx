import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ChevronDown, CheckCircle } from 'lucide-react';
import { fadeUp } from '../../../components/motion/variants';
import { diffWords, attachChangeAnnotations, type AnnotatedDiffOp } from '../../../domain/learn/feedback/buildChanges';
import type { CoachingIssue } from '../../../types';

interface Props {
  transcript: string;
  improvedAnswer?: string;
  changes?: import('../../../types').FeedbackV2['changes'];
  /** Fallback when there is no complete improved_answer (docs Stage 4 invariant #11). */
  issues?: CoachingIssue[];
}

function DiffChip({ op }: { op: AnnotatedDiffOp }) {
  const [open, setOpen] = useState(false);
  const hasExplanation = !!op.annotation;

  return (
    <span className="inline">
      {op.type === 'delete' || op.type === 'replace' ? (
        <span className="line-through decoration-red-400/70 decoration-2 text-slate-500">{op.beforeText}</span>
      ) : null}
      {op.type === 'insert' || op.type === 'replace' ? (
        hasExplanation ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="text-emerald-300 font-medium underline decoration-emerald-400/50 decoration-dotted underline-offset-2 cursor-pointer hover:opacity-80"
          >
            {op.afterText}
          </button>
        ) : (
          <span className="text-emerald-300 font-medium">{op.afterText}</span>
        )
      ) : null}
      {hasExplanation && open && (
        <AnimatePresence>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="block mt-1 mb-1 text-[9px] text-violet-300 bg-violet-500/8 border border-violet-500/15 rounded-md px-2 py-1"
          >
            {op.annotation!.explanation}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  );
}

function SafeCorrectionsList({ issues }: { issues: CoachingIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {issues.map(issue => (
        <div key={issue.id} className="flex items-start gap-1.5 text-[10px] p-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
          <CheckCircle size={10} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            {issue.quote && <span className="font-mono text-slate-500 line-through mr-1">{issue.quote}</span>}
            <span className="text-emerald-300 font-medium">{issue.correction}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BeforeAfterDiff({ transcript, improvedAnswer, changes, issues = [] }: Props) {
  // No complete improved_answer -> no diff, ever (docs Stage 4 invariant #11,
  // Stage 5: "it falls back to the Safe corrections individual-correction
  // presentation. A diff implies an authoritative corrected answer exists;
  // it must never appear when one does not.")
  if (!improvedAnswer) {
    if (issues.length === 0) return null;
    return (
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-xl glass p-4">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Safe Corrections</p>
        <SafeCorrectionsList issues={issues} />
      </motion.div>
    );
  }

  const ops = diffWords(transcript, improvedAnswer);
  const annotated = attachChangeAnnotations(ops, changes ?? []);
  const hasChange = annotated.some(op => op.type !== 'equal');
  if (!hasChange) return null;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-xl glass p-4">
      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Before → After</p>
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Your answer</p>
          <p className="text-[10px] text-slate-400 leading-relaxed italic">{transcript}</p>
        </div>
        <div className="flex justify-center">
          <ArrowDown size={14} className="text-sky-500/60" />
        </div>
        <div className="p-3 rounded-lg bg-sky-500/8 border border-sky-500/20">
          <p className="text-[8px] font-bold text-sky-500/70 uppercase tracking-wider mb-1.5">What changed</p>
          <p className="text-[11px] text-slate-200 leading-relaxed">
            {annotated.map((op, i) => op.type === 'equal'
              ? <span key={i}>{op.afterText}</span>
              : <DiffChip key={i} op={op} />
            )}
          </p>
        </div>
        {annotated.some(op => op.annotation) && (
          <p className="text-[8px] text-slate-600 flex items-center gap-1">
            <ChevronDown size={9} /> Tap a highlighted word for why it changed
          </p>
        )}
      </div>
    </motion.div>
  );
}

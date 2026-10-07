import { motion } from 'framer-motion';
import { scoreTone, isUnscored, coachScoreGrid } from '../../../domain/scoring';
import { fadeUp } from '../../../components/motion/variants';
import { cefrLevelLabel } from '../../../domain/learn/ability/levelLabel';
import type { FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  /**
   * 'line' (Batch 4, the coach view's first row): overall score, level and
   * word count on one line. 'full' (the Full report): adds the sub-score grid.
   */
  variant?: 'line' | 'full';
}

// No "Core+/Extended" band pill (Batch 4, D3): 0520 speaking is not tiered, and
// an unaudited band reads as a real result. The band stays in synced data.
export function SnapshotCard({ feedback, variant = 'full' }: Props) {
  const { scores, wordCount, cefrLevel, examiner } = feedback;
  const level = cefrLevelLabel(cefrLevel);
  const unscored = isUnscored(feedback);

  const scoreEntries = coachScoreGrid(scores);

  if (unscored) {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-xl surface-raised p-5"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-white text-sm">Results</h3>
          <span className="text-[9px] text-ink-subtle">{wordCount}w</span>
        </div>
        <p className="text-sm text-ink-muted font-semibold">Practiced offline — not graded</p>
        <p className="text-[11px] text-ink-muted mt-1 leading-snug">
          No AI grader was reachable for this attempt, so no score was assigned. Your evidence and coaching tips below are still real.
        </p>
      </motion.div>
    );
  }

  const meta = `${wordCount != null ? `${wordCount}w` : '…'}${level ? ` · ${level}` : ''}`;

  if (variant === 'line') {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-xl surface-raised px-5 py-3 flex items-baseline gap-2"
      >
        <span className="text-2xl font-black" style={{ color: scoreTone(scores.overall) }}>{scores.overall.toFixed(1)}</span>
        <span className="text-eyebrow text-ink-subtle uppercase">Overall</span>
        <span className="text-[10px] text-ink-subtle ml-auto">{meta}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="rounded-xl surface-raised p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-sm">Results</h3>
          {examiner?.oneLiner && (
            <p className="text-[11px] text-ink-muted italic mt-0.5 max-w-xs leading-snug">
              "{examiner.oneLiner}"
            </p>
          )}
        </div>
        <span className="text-[9px] text-ink-subtle">{meta}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black" style={{ color: scoreTone(scores.overall) }}>{scores.overall.toFixed(1)}</span>
        <span className="text-eyebrow text-ink-subtle uppercase">Overall</span>
      </div>

      <div className="grid grid-cols-4 gap-3 max-[380px]:grid-cols-2">
        {scoreEntries.map(({ label, val }, i) => (
          <div key={label} className="text-center">
            <motion.div
              className="text-xl font-black mb-1"
              style={{ color: scoreTone(val) }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 200 }}
            >
              {val.toFixed(1)}
            </motion.div>
            <div className="text-[9px] text-ink-subtle">{label}</div>
            <div className="mt-1.5 h-1 bg-track rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: scoreTone(val) }}
                initial={{ width: 0 }}
                animate={{ width: `${(val / 10) * 100}%` }}
                transition={{ delay: 0.25 + i * 0.05, duration: 0.6 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

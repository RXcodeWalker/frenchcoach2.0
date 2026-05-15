import { motion } from 'framer-motion';
import { scoreColor } from '../../../domain/scoring';
import { fadeUp } from '../../../components/motion/variants';
import type { FeedbackV2 } from '../../../types';

const BAND_LABEL: Record<string, string> = {
  'Foundation-Developing': 'Foundation',
  'Foundation-Secure': 'Foundation+',
  'Core-Developing': 'Core',
  'Core-Secure': 'Core+',
  'Extended-Mid': 'Extended',
  'Extended-High': 'Extended+',
};

interface Props {
  feedback: FeedbackV2;
}

export function SnapshotCard({ feedback }: Props) {
  const { scores, wordCount, cefrLevel, examiner } = feedback;
  const band = examiner?.predictedBand;

  const scoreEntries = [
    { label: 'Comm', val: scores.communication },
    { label: 'Lang', val: scores.language },
    { label: 'Fluency', val: scores.fluency },
    { label: 'Overall', val: scores.overall },
  ];

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="rounded-xl glass-elevated p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-sm">Results</h3>
          {examiner?.oneLiner && (
            <p className="text-[11px] text-slate-400 italic mt-0.5 max-w-xs leading-snug">
              "{examiner.oneLiner}"
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {band && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/20">
              {BAND_LABEL[band] ?? band}
            </span>
          )}
          <span className="text-[9px] text-slate-600">{wordCount}w · {cefrLevel}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 max-[380px]:grid-cols-2">
        {scoreEntries.map(({ label, val }, i) => (
          <div key={label} className="text-center">
            <motion.div
              className="text-xl font-black mb-1"
              style={{ color: scoreColor(val) }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 200 }}
            >
              {val.toFixed(1)}
            </motion.div>
            <div className="text-[9px] text-slate-600">{label}</div>
            <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full shimmer-bar"
                style={{ background: scoreColor(val) }}
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

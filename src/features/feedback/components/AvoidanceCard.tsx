import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { fadeUp } from '../../../components/motion/variants';
import type { AvoidanceReportEntry } from '../../../types';

interface Props {
  entries: AvoidanceReportEntry[];
}

const SKILL_LABELS: Record<string, string> = {
  hypothetical:      'Conditional / Hypothetical',
  subjunctive:       'Subjunctive Mood',
  opinion:           'Opinion Expression',
  connectors:        'Sentence Variety',
  word_count:        'Response Length',
  tense_future:      'Future / Conditional Tense',
  relative_pron:     'Relative Pronouns',
};

export function AvoidanceCard({ entries }: Props) {
  if (!entries.length) return null;

  return (
    <motion.div variants={fadeUp} className="rounded-xl surface border border-amber-500/15 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/10">
        <AlertTriangle size={13} className="text-amber-400" />
        <p className="text-[11px] font-bold text-ink-muted">
          Missed opportunities ({entries.length})
        </p>
        <span className="ml-auto text-[9px] text-amber-400/70 uppercase tracking-wide font-bold">Band boosters</span>
      </div>

      <div className="divide-y divide-amber-500/8">
        {entries.map((entry, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-amber-400">
              {SKILL_LABELS[entry.skillId] ?? entry.skillId}
            </p>
            <p className="text-[10px] text-ink-muted">{entry.observation}</p>
            <div className="flex items-start gap-1.5 mt-1">
              <Lightbulb size={10} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-emerald-300 font-medium">{entry.nudge}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

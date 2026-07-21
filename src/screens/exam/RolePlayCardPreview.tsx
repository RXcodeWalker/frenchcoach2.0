import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { RolePlayScenario } from '../../data/exam/bank/types';

interface Props {
  scenario: RolePlayScenario;
  onBegin: () => void;
}

export function RolePlayCardPreview({ scenario, onBegin }: Props) {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="mx-auto w-fit px-3 py-1 rounded-full text-[9px] font-bold border bg-amber-500/8 text-amber-400 border-amber-500/15"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          Role Play Card &middot; Preparation
        </motion.div>

        <div className="rounded-2xl glass-elevated p-6">
          <h1 className="text-xl font-black text-white mb-1">{scenario.title}</h1>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
            The examiner will read each task aloud in order. Respond to each one, then the exam moves to the next.
          </p>

          <div className="space-y-2.5">
            {scenario.tasks.map((task, idx) => (
              <motion.div
                key={task.questionId}
                className="rounded-xl glass-subtle p-3.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-electric/10 border border-violet-electric/20 text-violet-400 text-[9px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[12px] text-white leading-relaxed">{task.mainText}</p>
                    {task.secondPartText && (
                      <p className="text-[12px] text-slate-400 leading-relaxed">{task.secondPartText}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.button
          onClick={onBegin}
          className="btn-primary w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Begin <ArrowRight size={15} />
        </motion.button>
      </motion.div>
    </div>
  );
}

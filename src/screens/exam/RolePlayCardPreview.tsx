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
          <h1 className="text-xl font-black text-white mb-4">{scenario.title}</h1>

          <motion.div
            className="rounded-xl glass-subtle p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[13px] text-white leading-relaxed">{scenario.setup}</p>
          </motion.div>

          <p className="text-[11px] text-ink-muted leading-relaxed mt-5">
            You'll play the role above. The examiner will set the scene, then ask you five
            questions in French — answer each one. You won't see the questions in advance.
          </p>
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

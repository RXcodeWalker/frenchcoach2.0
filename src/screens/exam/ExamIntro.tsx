import { motion } from 'framer-motion';
import { Play, ArrowLeft } from 'lucide-react';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function ExamIntro({ onStart, onBack }: Props) {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center text-ink-muted hover:text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Exam Simulation</h1>
            <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">Mock Oral Assessment</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl glass-elevated border-amber-500/15 p-8 text-center">
          <div className="relative">
            <motion.div
              className="w-14 h-14 rounded-xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-center text-2xl mx-auto mb-5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              🎓
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-2">IGCSE Exam Simulation</h2>
            <p className="text-sm text-ink-muted leading-relaxed mb-6 max-w-md mx-auto">Experience a full IGCSE French oral exam. Self-paced preparation, then live speaking phases for each part.</p>
            <div className="grid grid-cols-3 gap-2 mb-7 max-w-sm mx-auto">
              {[
                { value: '~10m', label: 'Prep (untimed)', color: 'text-amber-400' },
                { value: '~2m', label: 'Role Play', color: 'text-violet-400' },
                { value: '~4m ea.', label: 'Topics', color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="p-2.5 rounded-xl glass-subtle">
                  <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-ink-subtle">{s.label}</p>
                </div>
              ))}
            </div>
            <motion.button
              onClick={onStart}
              className="btn-primary px-7 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={15} /> Begin Mock Exam
            </motion.button>
          </div>
        </div>

        <div className="rounded-xl glass p-5">
          <h3 className="font-bold text-ink-muted text-[10px] uppercase tracking-wider mb-3">Exam Structure</h3>
          <div className="space-y-1.5">
            {[
              { label: 'Preparation (untimed)', desc: 'Review your Role Play card and make notes — take as long as you like.' },
              { label: 'Part 1: Role Play', desc: "Answer the examiner's 5 questions in a role-play scenario." },
              { label: 'Part 2: Topic 1', desc: '~4 min conversation on Everyday Life topics (may extend with follow-up questions).' },
              { label: 'Part 3: Topic 2', desc: '~4 min conversation on The World topics (may extend with follow-up questions).' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg glass-subtle">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-white">{item.label}</p>
                  <p className="text-[9px] text-ink-subtle">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

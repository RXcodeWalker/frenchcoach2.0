import { motion } from 'framer-motion';
import { Zap, Target, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { ProgressRing } from '../../components/ProgressRing';
import { fadeUp } from '../../components/motion/variants';

const DAILY_GOAL = 3;

interface Props {
  todayCount: number;
  onLearn: () => void;
  onExam: () => void;
}

export function HeroMission({ todayCount, onLearn, onExam }: Props) {
  const goalComplete = todayCount >= DAILY_GOAL;

  return (
    <motion.div variants={fadeUp}>
      <div className="relative overflow-hidden rounded-3xl glass-elevated border-violet-electric/20 p-8 md:p-10">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Progress Section */}
          <div className="relative shrink-0">
            <ProgressRing
              value={todayCount}
              max={DAILY_GOAL}
              size={150}
              strokeWidth={12}
              color="#7C3AED"
              label={`${todayCount}/${DAILY_GOAL}`}
              sublabel="sessions"
              glow
            />
            {goalComplete && (
              <motion.div 
                className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-4 border-navy"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12 }}
              >
                <Sparkles size={18} className="text-white" />
              </motion.div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-electric/10 border border-violet-electric/20 mb-4">
              <Target size={12} className="text-violet-400" />
              <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Your Daily Mission</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
              {goalComplete ? (
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Mission Accomplished!</span>
              ) : (
                <>Only <span className="text-violet-400">{DAILY_GOAL - todayCount}</span> to reach your goal</>
              )}
            </h2>
            
            <p className="text-ink-muted text-sm md:text-base mb-8 max-w-md leading-relaxed font-medium">
              {goalComplete
                ? "You've hit your goal for today! Keep practicing to build your streak."
                : `Complete ${DAILY_GOAL - todayCount} more session${DAILY_GOAL - todayCount > 1 ? 's' : ''} to hit your daily goal.`}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={onLearn}
                className="btn-primary px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.3)] group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Zap size={18} className="group-hover:animate-pulse" /> 
                START LEARNING 
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <motion.button
                onClick={onExam}
                className="px-8 py-4 rounded-2xl font-bold text-sm border border-white/10 hover:border-white/20 text-ink-muted hover:text-white transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Clock size={16} /> Quick Test
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


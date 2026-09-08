import { motion } from 'framer-motion';
import { Zap, ArrowRight, RotateCcw, Home, Star, TrendingUp } from 'lucide-react';
import { ProgressRing } from './ProgressRing';

interface Props {
  score: number;
  xpEarned: number;
  wordCount: number;
  skillImprovement: { name: string; before: number; after: number };
  onNext: () => void;
  onRetry: () => void;
  onBack: () => void;
  message?: string;
}

export function SessionCompletion({
  score,
  xpEarned,
  wordCount,
  skillImprovement,
  onNext,
  onRetry,
  onBack,
  message = "You're crushing it! 🔥"
}: Props) {
  const isExcellent = score >= 8;
  const isGood = score >= 6;
  const accentColor = isExcellent ? '#10B981' : isGood ? '#F59E0B' : '#EF4444';

  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-navy/90 backdrop-blur-2xl" />
      
      <motion.div 
        className="relative z-10 w-full max-w-2xl surface-raised border-white/10 overflow-hidden"
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        {/* Top Celebration Banner */}
        <div className={`h-2 w-full bg-gradient-to-r from-transparent via-[${accentColor}] to-transparent opacity-50`} />
        
        <div className="p-8 md:p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              <div 
                className="absolute inset-0 blur-3xl opacity-20 rounded-full" 
                style={{ backgroundColor: accentColor }}
              />
              <ProgressRing
                value={score}
                max={10}
                size={160}
                strokeWidth={12}
                color={accentColor}
                label={score.toFixed(1)}
                sublabel="score"
                glow
              />
            </div>
          </motion.div>

          <motion.h2 
            className="text-3xl md:text-4xl font-black text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Session Complete!
          </motion.h2>
          <motion.p 
            className="text-ink-muted font-medium text-lg mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {message}
          </motion.p>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <StatCard 
              icon={<Zap className="text-emerald-400" size={18} />}
              label="XP Earned"
              value={`+${xpEarned}`}
              subValue="Daily Goal: 2/3"
            />
            <StatCard 
              icon={<Star className="text-amber-400" size={18} />}
              label="Fluency"
              value={`${skillImprovement.after}%`}
              subValue={`${skillImprovement.before}% → ${skillImprovement.after}%`}
              trend
            />
            <StatCard 
              icon={<TrendingUp className="text-cyan-400" size={18} />}
              label="Words Spoken"
              value={wordCount.toString()}
              subValue="New words: +12"
            />
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={onNext}
              className="btn-primary px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.4)]"
            >
              Continue Learning <ArrowRight size={20} />
            </button>
            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 px-6 py-4 rounded-2xl surface border-white/10 text-white font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Retry
              </button>
              <button
                onClick={onBack}
                className="flex-1 px-6 py-4 rounded-2xl surface border-white/10 text-white font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <Home size={18} /> Home
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, subValue, trend }: { icon: React.ReactNode, label: string, value: string, subValue: string, trend?: boolean }) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
        {icon}
      </div>
      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-black text-white">{value}</p>
        {trend && <span className="text-[10px] font-bold text-emerald-400 mb-1.5">↑</span>}
      </div>
      <p className="text-[10px] text-ink-subtle font-bold mt-1">{subValue}</p>
    </div>
  );
}

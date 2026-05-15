import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Star, Zap, Award } from 'lucide-react';

interface LevelUpProps {
  newLevel: string;
  onDismiss: () => void;
}

export function LevelUpCelebration({ newLevel, onDismiss }: LevelUpProps) {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    const timer = setTimeout(onDismiss, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-navy/80 backdrop-blur-xl" onClick={onDismiss} />
      
      <motion.div 
        className="relative z-10 w-full max-w-sm glass-elevated border-violet-electric/30 p-8 text-center"
        initial={{ scale: 0.8, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <motion.div 
            className="w-24 h-24 rounded-full bg-violet-electric flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.6)]"
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy size={48} className="text-white" />
          </motion.div>
        </div>

        <div className="mt-10">
          <motion.h2 
            className="text-3xl font-black text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            LEVEL UP!
          </motion.h2>
          <motion.div 
            className="text-violet-400 font-bold text-lg mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Welcome to {newLevel}
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 gap-3 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Zap size={16} className="text-amber-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 uppercase font-bold">New Bonus</p>
              <p className="text-sm font-bold text-white">+5% XP</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Star size={16} className="text-cyan-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 uppercase font-bold">Unlocked</p>
              <p className="text-sm font-bold text-white">Advanced Labs</p>
            </div>
          </motion.div>

          <motion.button
            onClick={onDismiss}
            className="btn-primary w-full py-3 rounded-xl font-bold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Keep Crushing It
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface AchievementProps {
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  onDismiss: () => void;
}

export function AchievementUnlocked({ name, icon, description, xpReward, onDismiss }: AchievementProps) {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#7C3AED', '#6366F1', '#10B981']
    });
    
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div 
      className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
    >
      <div className="glass-elevated border-amber-500/30 p-5 flex gap-4 items-center">
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Award size={12} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Achievement Unlocked</span>
          </div>
          <h3 className="text-white font-bold text-lg leading-tight">{name}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{description}</p>
          <div className="mt-2 text-emerald-400 text-xs font-bold flex items-center gap-1">
            <Zap size={10} /> +{xpReward} XP REWARD
          </div>
        </div>
        <button 
          onClick={onDismiss}
          className="text-slate-500 hover:text-white transition-colors p-1"
        >
          <ChevronX size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function ChevronX({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { getOverdriveStreakClasses } from '../animations';

interface StreakBadgeProps {
  streak: number;
  isOverdrive?: boolean;
  minVisible?: number;
  overdriveLabel?: string;
  className?: string;
}

export function StreakBadge({
  streak,
  isOverdrive = false,
  minVisible = 2,
  overdriveLabel = 'OVERDRIVE!',
  className = '',
}: StreakBadgeProps) {
  if (streak < minVisible) return null;

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-500 ${getOverdriveStreakClasses(isOverdrive)} ${className}`}
    >
      <Flame
        size={14}
        className={isOverdrive ? 'fill-slate-950' : 'fill-orange-400/20'}
      />
      <span className="text-sm font-black italic tracking-tight uppercase">
        {isOverdrive ? overdriveLabel : `${streak} COMBO`}
      </span>
    </motion.div>
  );
}

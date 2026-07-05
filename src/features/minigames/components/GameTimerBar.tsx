import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { getTimerBarColor, type AccentColor } from '../animations';

interface GameTimerBarProps {
  timeLeft: number;
  maxTime: number;
  isCritical?: boolean;
  isOverdrive?: boolean;
  accentColor?: AccentColor;
  showLabel?: boolean;
  showBar?: boolean;
  formatTime?: (seconds: number) => string;
  className?: string;
}

function defaultFormat(seconds: number): string {
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

export function GameTimerBar({
  timeLeft,
  maxTime,
  isCritical,
  isOverdrive = false,
  accentColor = 'amber',
  showLabel = true,
  showBar = true,
  formatTime = defaultFormat,
  className = '',
}: GameTimerBarProps) {
  const critical = isCritical ?? timeLeft < (Number.isInteger(maxTime) ? 10 : 5);
  const progress = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0;
  const barColor = getTimerBarColor(accentColor, critical, isOverdrive);

  return (
    <div className={className}>
      {showLabel && (
        <div
          className={`glass-elevated px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
            showBar ? 'mb-4' : ''
          } ${
            critical
              ? 'border-red-500 animate-pulse text-red-400'
              : 'border-blue-500/20 text-blue-400'
          }`}
        >
          <Timer size={16} />
          <span className="text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
        </div>
      )}

      {showBar && (
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className={`h-full transition-colors ${barColor}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { countdownPopVariants } from '../animations';

interface GameCountdownProps {
  display: string | number;
  value: number;
  className?: string;
  textClassName?: string;
}

export function GameCountdown({
  display,
  value,
  className = 'min-h-[80vh] flex items-center justify-center',
  textClassName = 'text-9xl font-black text-amber-400 italic tracking-tighter',
}: GameCountdownProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          variants={countdownPopVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={textClassName}
        >
          {display}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

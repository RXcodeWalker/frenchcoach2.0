import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem } from 'lucide-react';

interface GemBalanceProps {
  balance: number;
  shake?: boolean;
}

/**
 * Shop plan §7 (new, minimal): "GemBalance (animated count)". §8: on
 * purchase "gem counter rolls down digit-by-digit" instead of confetti —
 * restraint reads as expensive (§12.3). Each digit is its own AnimatePresence
 * slot keyed by its value, sliding out/in vertically on change.
 */
export function GemBalance({ balance, shake }: GemBalanceProps) {
  const [display, setDisplay] = useState(balance);
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (balance === prevBalance.current) return;
    const from = prevBalance.current;
    const to = balance;
    prevBalance.current = balance;

    const steps = Math.min(Math.abs(to - from), 20);
    if (steps === 0) {
      setDisplay(to);
      return;
    }
    const direction = to > from ? 1 : -1;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const progress = step / steps;
      const next = Math.round(from + direction * Math.abs(to - from) * progress);
      setDisplay(step === steps ? to : next);
      if (step >= steps) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [balance]);

  const digits = display.toLocaleString().split('');

  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
      className="flex items-center gap-2 px-4 py-2 rounded-xl glass border-emerald-500/20 bg-emerald-500/10"
    >
      <Gem size={16} className="text-emerald-400" />
      <span className="text-lg font-black text-white flex overflow-hidden">
        {digits.map((char, i) => (
          <span key={`${i}-${digits.length}`} className="relative inline-block overflow-hidden h-[1.2em]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={char}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ duration: 0.2 }}
                className="block"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
      </span>
    </motion.div>
  );
}

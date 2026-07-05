import { AnimatePresence, motion } from 'framer-motion';
import type { FloatingXPItem } from '../hooks/useFloatingXP';

interface FloatingXPOverlayProps {
  items: FloatingXPItem[];
  className?: string;
}

export function FloatingXPOverlay({ items, className = '' }: FloatingXPOverlayProps) {
  return (
    <AnimatePresence>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 0, x: item.x }}
          animate={{ opacity: 1, y: -40 }}
          exit={{ opacity: 0 }}
          className={`absolute font-black text-amber-400 pointer-events-none text-lg ${className}`}
        >
          {item.text ?? (item.amount > 0 ? `+${item.amount}` : item.label)}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import type { FloatingXPItem } from '../hooks/useFloatingXP';

interface FloatingXPOverlayProps {
  items: FloatingXPItem[];
  className?: string;
  animateY?: number;
}

function itemClassName(item: FloatingXPItem, base: string): string {
  if (item.type === 'time') return `${base} text-blue-400 text-lg`;
  if (item.type === 'combo') return `${base} text-purple-400 text-2xl italic`;
  return `${base} text-amber-400 text-lg`;
}

export function FloatingXPOverlay({
  items,
  className = '',
  animateY = -40,
}: FloatingXPOverlayProps) {
  return (
    <AnimatePresence>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 0, x: item.x }}
          animate={{ opacity: 1, y: animateY }}
          exit={{ opacity: 0 }}
          className={`absolute pointer-events-none flex flex-col items-center whitespace-nowrap ${className}`}
        >
          <span className={itemClassName(item, 'font-black')}>
            {item.text ?? (item.amount > 0 ? `+${item.amount}` : item.label)}
          </span>
          {item.label && item.amount > 0 && !item.text && (
            <span className="text-[10px] font-black text-white bg-orange-600 px-2 py-0.5 rounded-full uppercase italic tracking-tighter mt-0.5">
              {item.label}
            </span>
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

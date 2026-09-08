import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import type { Screen } from '../../types/index';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const ITEMS: { icon: string; label: string; screen: Screen; badge?: string }[] = [
  { icon: '📚', label: 'Practice', screen: 'learn' as Screen },
  { icon: '📻', label: 'News', screen: 'daily-news' as Screen },
  { icon: '🎓', label: 'Exam', screen: 'exam' as Screen },
  { icon: '🧭', label: 'Explore', screen: 'explore' as Screen },
  { icon: '📊', label: 'Progress', screen: 'progress' as Screen },
  { icon: '🛍️', label: 'Shop', screen: 'shop' as Screen },
];

export function QuickAccess({ onNavigate }: Props) {
  return (
    <motion.div variants={fadeUp}>
      <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-wider mb-2.5">Quick Access</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {ITEMS.map(item => (
          <motion.button
            key={item.label}
            onClick={() => onNavigate(item.screen)}
            className="group relative flex flex-col items-center gap-1.5 p-3 rounded-xl glass-subtle hover:bg-white/[0.04] transition-all duration-200"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {item.badge && (
              <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 rounded-md shadow-lg shadow-rose-500/20 z-10">
                <span className="text-[6px] font-black text-white uppercase">{item.badge}</span>
              </div>
            )}
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
            <span className="text-[10px] font-bold text-ink-muted group-hover:text-white transition-colors">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

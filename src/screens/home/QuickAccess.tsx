import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { Screen } from '../../types/index';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const ITEMS: { label: string; screen: Screen }[] = [
  { label: 'Practice', screen: 'learn' as Screen },
  { label: 'Daily news', screen: 'daily-news' as Screen },
  { label: 'Exam', screen: 'exam' as Screen },
  { label: 'Explore', screen: 'explore' as Screen },
  { label: 'Progress', screen: 'progress' as Screen },
  { label: 'Shop', screen: 'shop' as Screen },
];

/**
 * Quick access (SCREENS §3): no violet fills — plain list rows on a recessed
 * surface, the whole row is the link, chevron on the right, 2% ink hover.
 * There is no primary here; the one primary on the screen is the mission CTA.
 */
export function QuickAccess({ onNavigate }: Props) {
  return (
    <motion.div variants={fadeUp}>
      <h3 className="text-eyebrow uppercase text-ink-subtle mb-2.5">Quick access</h3>
      <div className="surface-recessed rounded-card overflow-hidden">
        {ITEMS.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.screen)}
            className={`flex w-full items-center justify-between px-4 min-h-[44px] text-left
              transition-colors duration-state ease-smooth
              hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]
              ${i > 0 ? 'border-t border-hairline' : ''}`}
          >
            <span className="text-body-s text-ink-muted">{item.label}</span>
            <ChevronRight size={16} className="text-ink-subtle" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

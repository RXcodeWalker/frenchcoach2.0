import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { WorkedItem } from '../../features/myPlan/planModel';

/**
 * What happened when you followed the coach: the advice, and the metric it
 * aimed at read before and after (the coach outcome log). Ups and downs both —
 * two numbers, never a verdict. Hidden until one has been measured.
 */
export function PlanWorked({ items }: { items: WorkedItem[] }) {
  if (items.length === 0) return null;
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="plan-worked"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="plan-worked"
    >
      <div className="flex flex-col gap-1">
        <h2 id="plan-worked" className="text-section text-ink">When you followed the plan</h2>
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          The number the advice aimed at, before and after. When something doesn’t move twice, your coach tries a different way.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map(({ title, change }) => {
          const Icon = change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : ArrowRight;
          return (
            <li key={title} className="flex flex-col gap-0.5 border-t border-hairline pt-3 first:border-t-0 first:pt-0">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[14px] font-semibold text-ink">{title}</span>
                <span className={`inline-flex items-center gap-1 font-numeral text-[14px] ${change.direction === 'up' ? 'text-progress-text' : 'text-ink-subtle'}`}>
                  {change.from}
                  <Icon size={13} aria-label={change.direction === 'up' ? 'up to' : change.direction === 'down' ? 'down to' : 'still'} />
                  {change.to}
                </span>
              </span>
              <span className="text-caption text-ink-subtle">
                {change.label} · {change.basis}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

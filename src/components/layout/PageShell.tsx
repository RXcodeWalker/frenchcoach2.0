import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { stagger } from '../motion/variants';

interface Props {
  children: ReactNode;
  /** home 920 · xl 1120 (default) · md 760 · sm 600 */
  maxWidth?: 'home' | 'xl' | 'md' | 'sm';
  /** Vertical gap between direct children, px. */
  gap?: 16 | 24;
  className?: string;
}

const widthClass = {
  home: 'max-w-[920px]',
  xl: 'max-w-[1120px]',
  md: 'max-w-[760px]',
  sm: 'max-w-[600px]',
};

/**
 * Page body (Design System v2): centred column, padding
 * `clamp(24px,4cqw,40px) clamp(16px,3cqw,32px) 48px` measured against the
 * content area (it is the size container), plus room for the mobile dock.
 * Children that use the `enter` variant rise in 50ms apart.
 */
export function PageShell({ children, maxWidth = 'xl', gap = 24, className = '' }: Props) {
  return (
    <div className="[container-type:inline-size] pb-[88px] md:pb-0">
      <motion.div
        className={`${widthClass[maxWidth]} mx-auto flex flex-col px-[clamp(16px,3cqw,32px)] pt-[clamp(24px,4cqw,40px)] pb-12 ${className}`}
        style={{ gap }}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {children}
      </motion.div>
    </div>
  );
}

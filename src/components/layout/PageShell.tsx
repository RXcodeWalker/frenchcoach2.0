import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { stagger } from '../motion/variants';

interface Props {
  children: ReactNode;
  maxWidth?: 'sm' | 'xl';
}

const widthClass = {
  sm: 'max-w-2xl',
  xl: 'max-w-5xl',
};

export function PageShell({ children, maxWidth = 'xl' }: Props) {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className={`${widthClass[maxWidth]} mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5`}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {children}
      </motion.div>
    </div>
  );
}

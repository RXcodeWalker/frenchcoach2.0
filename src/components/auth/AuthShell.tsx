import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { enter, enterReduced } from '../motion/variants';

interface Props {
  /** Heading inside the page, under the brand mark. */
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Content under the card (a quiet secondary route, a small note). */
  below?: ReactNode;
}

/**
 * The frame shared by the sign-in, password-reset and age-check screens
 * (Design System v2): flat --bg page, brand mark, one --surface card. No
 * gradient, glow, blur or emoji; the card enters with the `enter` motion.
 */
export function AuthShell({ title, subtitle, children, below }: Props) {
  const reduced = useReducedMotion();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <motion.main
        className="w-full max-w-[400px]"
        variants={reduced ? enterReduced : enter}
        initial="hidden"
        animate="show"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-4 text-title text-ink">{title}</h1>
          {subtitle != null && <p className="mt-1.5 text-body-s text-ink-muted">{subtitle}</p>}
        </div>
        <div className="surface rounded-card p-5 shadow-card sm:p-6">{children}</div>
        {below != null && <div className="mt-4 text-center">{below}</div>}
      </motion.main>
    </div>
  );
}

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-action font-numeral text-action-ink ${
        small ? 'h-9 w-9 rounded-control text-[18px]' : 'h-12 w-12 rounded-card text-[22px]'
      }`}
    >
      F
    </span>
  );
}

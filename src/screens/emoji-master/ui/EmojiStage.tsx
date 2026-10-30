import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { enter, enterReduced } from '../../../components/motion/variants';

interface Props {
  /** The prompt: emoji (most modes) or a French word (Reverse). */
  prompt: string;
  promptKind: 'emoji' | 'french';
  /** A sentence prompt is several emoji, so it is set smaller. */
  small?: boolean;
  /** The instruction under the prompt; swapped for the reveal once answered. */
  caption: string;
  outcome: 'correct' | 'incorrect' | null;
  /** Shown instead of the caption once answered. */
  reveal?: ReactNode;
  /** Remount key, so each question enters afresh. */
  questionKey: string;
  /** Extra line above the prompt (e.g. "Overdrive"). */
  badge?: ReactNode;
}

/**
 * The question card. The border turns to the answer's role (progress /
 * correction) and the prompt never moves; only the caption underneath changes.
 */
export function EmojiStage({ prompt, promptKind, small, caption, outcome, reveal, questionKey, badge }: Props) {
  const reduced = useReducedMotion();
  const tone =
    outcome === 'correct' ? 'border-progress' : outcome === 'incorrect' ? 'border-correction' : 'border-hairline';
  return (
    <motion.div
      key={questionKey}
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className={`relative flex flex-col items-center gap-3 rounded-card border bg-surface px-4 py-8 text-center shadow-card transition-colors duration-state ${tone}`}
    >
      {badge && <div className="absolute left-3 top-3">{badge}</div>}
      {promptKind === 'emoji' ? (
        <div
          className={`select-none leading-none ${small ? 'text-[56px] sm:text-[72px]' : 'text-[84px] sm:text-[104px]'}`}
        >
          {prompt}
        </div>
      ) : (
        <h2 className="text-display-m text-ink" lang="fr">
          {prompt}
        </h2>
      )}
      <div className="flex min-h-[28px] w-full items-center justify-center">
        {reveal ?? <p className="text-body-s text-ink-muted">{caption}</p>}
      </div>
    </motion.div>
  );
}

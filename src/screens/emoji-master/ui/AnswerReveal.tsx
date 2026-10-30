import { motion, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { correct } from '../../../components/motion/variants';
import type { EmojiQuestion } from '../../../data/emojiQuestions';
import { HearButton } from './HearButton';

export type RevealKind = 'correct' | 'miss' | 'timeout';

interface Props {
  kind: RevealKind;
  question: EmojiQuestion;
  /** What the learner gave: typed text or the choice they tapped. Not for a timeout. */
  userAnswer?: string;
  /** Reverse mode answers with an emoji, so the fix leads with it. */
  showEmojiWithFix?: boolean;
  /** One line, for Speed Blitz where the next word follows at once. */
  compact?: boolean;
}

/** Strike the wrong answer, drop the fix in, underline it — the `correct` motion. */
function StruckThrough({ children, reduced }: { children: string; reduced: boolean | null }) {
  return (
    <span className="relative inline-block text-ink-subtle">
      {children}
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 h-[2px] origin-left bg-correction"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={correct.strike(0)}
      />
    </span>
  );
}

function Fix({ children, reduced }: { children: string; reduced: boolean | null }) {
  return (
    <span className="relative inline-block">
      <motion.span
        className="inline-block text-ink"
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={correct.fix(0)}
      >
        {children}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-progress"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={correct.underline(0)}
      />
    </span>
  );
}

export function AnswerReveal({ kind, question, userAnswer, showEmojiWithFix = false, compact = false }: Props) {
  const reduced = useReducedMotion();
  const ok = kind === 'correct';
  const fix = showEmojiWithFix ? `${question.emojis} ${question.french}` : question.french;
  const heading = ok ? 'Correct' : kind === 'timeout' ? "Time's up" : 'Not quite';
  const struck = !ok && userAnswer && userAnswer.trim() ? userAnswer : null;

  if (compact) {
    return (
      <p role="status" className="flex min-h-7 items-center justify-center gap-2 text-[17px] font-semibold" lang="fr">
        {ok ? (
          <span className="flex items-center gap-1.5 text-progress-text">
            <Check size={18} aria-hidden="true" />
            <span lang="en">Correct</span>
          </span>
        ) : (
          <>
            {struck && <StruckThrough reduced={reduced}>{struck}</StruckThrough>}
            <Fix reduced={reduced}>{fix}</Fix>
          </>
        )}
      </p>
    );
  }

  return (
    <div role="status" className="flex flex-col items-center gap-1.5">
      <p className={`flex items-center gap-1.5 text-label ${ok ? 'text-progress-text' : 'text-correction-text'}`}>
        {ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
        {heading}
      </p>
      <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-title" lang="fr">
        {struck && <StruckThrough reduced={reduced}>{struck}</StruckThrough>}
        <Fix reduced={reduced}>{fix}</Fix>
      </p>
      <p className="text-body-s text-ink-subtle">{question.english}</p>
      <HearButton text={question.french} />
    </div>
  );
}

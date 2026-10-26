import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { TopicChip } from '../../components/ui/TopicChip';

interface Props {
  topicKey: string | null;
  /** French topic name, or null before any recommendation exists. */
  topicLabel: string | null;
  body: string;
  /** One-line version for the compact focus strip. */
  short: string;
  skills: string[];
  /** Why this topic: "Weakest topic", "Today's focus". */
  tag?: string | null;
  onOpen: () => void;
  compact?: boolean;
}

/**
 * Coach's pick (Home 2a). Desktop: a card under the mission naming the topic,
 * why, and the skills it targets; the whole card opens that topic. Compact:
 * the one-line "Focus:" strip Home passes as the mission card's footer.
 */
export function CoachPick({ topicKey, topicLabel, body, short, skills, tag, onOpen, compact = false }: Props) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-state ease-smooth hover:bg-track"
        data-testid="home-coach-pick"
      >
        <TopicChip topicKey={topicKey} size={20} />
        <span className="min-w-0 flex-1 text-[14px] leading-[1.45] text-ink-muted">
          <strong className="font-semibold text-ink">Focus: {topicLabel ?? 'General practice'}</strong> — {short}
        </span>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      variants={fadeUp}
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-card border border-hairline bg-surface p-5 text-left text-ink
        transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
      data-testid="home-coach-pick"
    >
      <TopicChip topicKey={topicKey} size={40} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-eyebrow uppercase">
          <span className="text-action-text">Coach’s pick</span>
          {tag && (
            <>
              <span className="text-ink-subtle" aria-hidden="true">·</span>
              <span className="text-ink-subtle">{tag}</span>
            </>
          )}
        </span>
        <span className="text-[16px] font-semibold leading-[1.35]">{topicLabel ?? 'Complete a session to get a personalised topic'}</span>
        <span className="text-body-s text-ink-muted [text-wrap:pretty]">{body}</span>
        {skills.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {skills.map(k => (
              <span key={k} className="inline-flex h-6 items-center rounded-pill border border-hairline-strong px-2 text-caption font-medium text-ink-muted">
                {k}
              </span>
            ))}
          </span>
        )}
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
    </motion.button>
  );
}

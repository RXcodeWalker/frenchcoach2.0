import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Award, X, Zap } from 'lucide-react';
import { celebrate, enter } from './motion/variants';
import { achievementIcon } from '../features/profile/achievementDisplay';

/**
 * Post-session celebrations (Design System v2 `celebrate`): a raised toast,
 * max 380px, centred above the dock — a 32px reward-soft icon box that pops
 * in, a 14/600 title, a 13px body and a 44px dismiss. No confetti, no glow,
 * no looping motion; the top bar's XP pill counts up alongside it.
 */
function CelebrationToast({ icon, title, body, onDismiss, testId }: { icon: ReactNode; title: ReactNode; body: ReactNode; onDismiss: () => void; testId?: string }) {
  return (
    <motion.div
      variants={enter}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      role="status"
      data-testid={testId}
      className="pointer-events-none fixed bottom-[96px] left-0 right-0 z-[100] flex justify-center px-4 md:bottom-6 md:left-[88px]"
    >
      <div className="pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-card border border-hairline-strong bg-surface-raised py-2 pl-3.5 pr-2 shadow-overlay">
        <motion.span
          variants={celebrate}
          initial="hidden"
          animate="show"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-reward-soft text-reward-text"
          aria-hidden="true"
        >
          {icon}
        </motion.span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-semibold text-ink">{title}</span>
          <span className="text-[13px] text-ink-muted">{body}</span>
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

interface LevelUpProps {
  newLevel: string;
  onDismiss: () => void;
}

export function LevelUpCelebration({ newLevel, onDismiss }: LevelUpProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <CelebrationToast
      testId="level-up"
      icon={<Zap size={16} />}
      title="New level reached"
      body={`Welcome to ${newLevel}. Keep practising to reach the next one.`}
      onDismiss={onDismiss}
    />
  );
}

interface AchievementProps {
  /** Achievement id, for its icon. */
  id?: string;
  name: string;
  description: string;
  onDismiss: () => void;
}

export function AchievementUnlocked({ id, name, description, onDismiss }: AchievementProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = id ? achievementIcon(id) : Award;
  return (
    <CelebrationToast
      testId="achievement-unlocked"
      icon={<Icon size={16} />}
      title={<>Achievement unlocked · {name}</>}
      body={description}
      onDismiss={onDismiss}
    />
  );
}

/** The XP just earned, shown briefly after a scored answer. */
export function XPEarnedToast({ amount, onDismiss }: { amount: number; onDismiss: () => void }) {
  return (
    <CelebrationToast
      testId="xp-toast"
      icon={<Zap size={16} />}
      title={<span className="font-numeral">{amount >= 0 ? '+' : ''}{amount} XP</span>}
      body="Added to your total"
      onDismiss={onDismiss}
    />
  );
}

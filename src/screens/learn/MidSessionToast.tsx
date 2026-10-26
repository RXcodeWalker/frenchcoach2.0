import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Zap, ArrowDown, ArrowUp } from 'lucide-react';
import { SessionToast } from './SessionToast';

export type MidSessionToastVariant = 'progress' | 'difficulty-up' | 'difficulty-down';

interface Props {
  show: boolean;
  /** docs §14 — defaults to 'progress' so every existing call site (the "Halfway there!" toast) is unchanged. */
  variant?: MidSessionToastVariant;
  questionsCompleted: number;
  targetCount: number;
  avgScore: number | null;
  onDismiss: () => void;
}

/** docs §8.4 — exact copy for the two difficulty variants. */
const DIFFICULTY_COPY: Record<'difficulty-up' | 'difficulty-down', { title: string; body: string }> = {
  'difficulty-down': {
    title: 'Easing off',
    body: 'The next few questions sit right at your level.',
  },
  'difficulty-up': {
    title: 'Stepping up',
    body: 'Adding a question that pushes you a bit.',
  },
};

export function MidSessionToast({ show, variant = 'progress', questionsCompleted, targetCount, avgScore, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  const isAboveAvg = avgScore !== null && avgScore >= 7;

  return (
    <AnimatePresence>
      {show && (variant === 'progress' ? (
        <SessionToast
          icon={<Zap size={16} />}
          iconClass="bg-action-soft text-action-text"
          title="Halfway there"
          body={
            <>
              {questionsCompleted}/{targetCount} done
              {avgScore !== null && ` · avg ${avgScore.toFixed(1)}`}
              {isAboveAvg && <span className="font-medium text-progress-text"> · above your personal average</span>}
            </>
          }
          onDismiss={onDismiss}
        />
      ) : (
        <SessionToast
          icon={variant === 'difficulty-down' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
          iconClass="bg-action-soft text-action-text"
          title={DIFFICULTY_COPY[variant].title}
          body={DIFFICULTY_COPY[variant].body}
          onDismiss={onDismiss}
        />
      ))}
    </AnimatePresence>
  );
}

import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { SessionToast } from './SessionToast';

interface Props {
  streak: number;
  show: boolean;
  onDismiss: () => void;
}

export function StreakToast({ streak, show, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, streak >= 5 ? 3000 : 2000);
    return () => clearTimeout(t);
  }, [show, streak, onDismiss]);

  const isOnFire = streak >= 5;

  return (
    <AnimatePresence>
      {show && (
        <SessionToast
          icon={<Flame size={16} />}
          iconClass="bg-reward-soft text-streak-text"
          title={isOnFire ? 'On fire' : 'Hot streak'}
          body={<span className="font-numeral">{streak} correct in a row</span>}
          onDismiss={onDismiss}
        />
      )}
    </AnimatePresence>
  );
}

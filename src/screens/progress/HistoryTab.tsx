import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import type { Session } from '../../types/index';

interface Props {
  sessions: Session[];
}

export function HistoryTab({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <motion.div variants={fadeUp} className="surface-recessed rounded-card p-8 text-center">
        <p className="text-body-s text-ink-muted">Your sessions will appear here.</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp} className="surface-recessed rounded-card overflow-hidden">
      {sessions.map((session, i) => (
        <div
          key={session.id}
          className={`grid items-center gap-3 px-3.5 min-h-[44px] py-2
            ${i > 0 ? 'border-t border-hairline' : ''}`}
          style={{ gridTemplateColumns: 'minmax(0,1fr) 64px 72px' }}
        >
          <div className="min-w-0">
            <p className="text-body-s text-ink-muted capitalize truncate">
              {session.mode} · {session.topicKey ?? 'General'}
            </p>
            <p className="text-body-s text-ink-subtle">
              {session.wordCount} words · {Math.floor(session.durationSec / 60)}m
            </p>
          </div>
          <span className="text-right font-numeral text-body-s text-ink tabular-nums">
            {session.score == null ? '—' : session.score.toFixed(1)}
          </span>
          <span className="text-right font-numeral text-body-s text-progress-text tabular-nums">
            +{session.xpEarned} XP
          </span>
        </div>
      ))}
    </motion.div>
  );
}

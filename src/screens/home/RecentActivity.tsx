import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import type { Session } from '../../types/index';

interface Props {
  sessions: Session[];
}

/**
 * Recent activity (SCREENS §3): a --surface-recessed list, 44px rows on
 * hairline rules, no zebra, no card-per-row. Scores are mono --ink, not
 * tinted by quality; XP is the reward role.
 */
export function RecentActivity({ sessions }: Props) {
  const rows = sessions.slice(0, 4);

  return (
    <motion.div variants={fadeUp}>
      <h3 className="text-eyebrow uppercase text-ink-subtle mb-2.5">Recent activity</h3>
      <div className="surface-recessed rounded-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-4 min-h-[44px] flex items-center">
            <span className="text-body-s text-ink-subtle">
              Your sessions will appear here.{' '}
              <span className="text-action-text">Record your first answer</span>
            </span>
          </div>
        ) : (
          rows.map((session, i) => (
            <div
              key={session.id}
              className={`flex items-center gap-3 px-4 min-h-[44px] py-2.5
                ${i > 0 ? 'border-t border-hairline' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-body-s text-ink-muted capitalize truncate">
                  {session.mode} · {session.topicKey ?? 'General'}
                </p>
              </div>
              <span className="font-numeral text-body-s text-ink tabular-nums shrink-0">
                {session.score == null ? '—' : session.score.toFixed(1)}
              </span>
              <span className="font-numeral text-body-s text-progress-text tabular-nums shrink-0 w-16 text-right">
                +{session.xpEarned} XP
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

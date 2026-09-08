import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import type { Session } from '../../types/index';

interface Props {
  sessions: Session[];
}

export function RecentActivity({ sessions }: Props) {
  return (
    <motion.div variants={fadeUp}>
      <h3 className="text-[10px] font-black text-ink-muted uppercase tracking-wider mb-2.5">Recent Activity</h3>
      <div className="space-y-1.5">
        {sessions.slice(0, 3).map(session => (
          <motion.div
            key={session.id}
            className="flex items-center gap-3 p-3 rounded-xl glass-subtle hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
            whileHover={{ x: 4 }}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
              session.mode === 'practice' ? 'bg-blue-500/8 border border-blue-500/15' :
              session.mode === 'exam' ? 'bg-amber-500/8 border border-amber-500/15' :
              'bg-emerald-500/8 border border-emerald-500/15'
            }`}>
              {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : '💬'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white capitalize">{session.mode}</p>
              <p className="text-[10px] text-ink-muted font-bold truncate">{session.topicKey ?? 'General'}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-black text-white">{session.score == null ? '—' : session.score.toFixed(1)}<span className="text-[9px] text-ink-muted font-bold">/10</span></p>
              <p className="text-[9px] text-emerald-400 font-bold">+{session.xpEarned} XP</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

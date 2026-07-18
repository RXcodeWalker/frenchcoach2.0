import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import type { Session } from '../../types/index';

interface Props {
  sessions: Session[];
}

export function HistoryTab({ sessions }: Props) {
  return (
    <motion.div variants={fadeUp} className="rounded-xl glass p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={14} className="text-violet-400" />
        <h3 className="font-bold text-white text-sm">Session History</h3>
      </div>
      <div className="space-y-1.5">
        {sessions.map(session => (
          <motion.div
            key={session.id}
            className="flex items-center gap-3 p-2.5 rounded-lg glass-subtle hover:bg-white/[0.02] transition-all cursor-pointer"
            whileHover={{ x: 4 }}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
              session.mode === 'practice' ? 'bg-violet-electric/8 border border-violet-electric/15' :
              session.mode === 'exam' ? 'bg-amber-500/8 border border-amber-500/15' :
              'bg-emerald-500/8 border border-emerald-500/15'
            }`}>
              {session.mode === 'practice' ? '📚' : session.mode === 'exam' ? '📝' : '💬'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-white capitalize">{session.mode}</p>
              <p className="text-[9px] text-slate-700">{session.wordCount} words / {Math.floor(session.durationSec / 60)}m</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-bold text-white">{session.score == null ? '—' : session.score.toFixed(1)}<span className="text-[8px] text-slate-700">/10</span></p>
              <p className="text-[9px] text-emerald-400 font-semibold">+{session.xpEarned} XP</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

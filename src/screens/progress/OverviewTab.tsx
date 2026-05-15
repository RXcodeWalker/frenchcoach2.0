import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, Zap } from 'lucide-react';
import { ProgressRing } from '../../components/ProgressRing';
import { getLevelInfo, LEVELS } from '../../domain/levels';
import { MOCK_DAILY } from '../../data/mocks/mockDaily';
import { fadeUp } from '../../components/motion/variants';
import { WeeklyChart } from '../../components/WeeklyChart';
import type { UserProfile } from '../../types/index';

interface Props {
  profile: UserProfile;
}

export function OverviewTab({ profile }: Props) {
  const { current, progress } = getLevelInfo(profile.total_xp);
  return (
    <>
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { icon: <Zap size={15} className="text-violet-400" />, value: profile.total_xp.toLocaleString(), label: 'Total XP' },
          { icon: <span className="text-sm">🔥</span>, value: profile.streak_days, label: 'Day Streak' },
          { icon: <span className="text-sm">📚</span>, value: profile.sessions_count, label: 'Sessions' },
          { icon: <span className="text-sm">💬</span>, value: profile.total_words_spoken.toLocaleString(), label: 'Words' },
        ].map(s => (
          <div key={s.label} className="rounded-xl glass p-3.5">
            <div className="mb-1.5">{s.icon}</div>
            <p className="text-lg font-black text-white">{s.value}</p>
            <p className="text-[9px] text-slate-600 font-medium">{s.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} className="text-amber-400" />
          <h3 className="font-bold text-white text-sm">Level Progress</h3>
          <span className="ml-auto text-[10px] font-bold text-amber-400">{current.icon} {current.level}</span>
        </div>
        <div className="flex items-center gap-6">
          <ProgressRing value={progress} size={85} strokeWidth={7} color="#F59E0B" label={`${Math.round(progress)}%`} sublabel="to next" />
          <div className="flex-1 space-y-1.5">
            {LEVELS.map(lvl => {
              const isCurrent = lvl.level === current.level;
              const isPast = profile.total_xp >= lvl.minXP && !isCurrent;
              return (
                <div key={lvl.level} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] border ${
                    isPast ? 'bg-emerald-500 border-emerald-500' : isCurrent ? 'bg-violet-electric border-violet-electric shadow-[0_0_6px_rgba(124,58,237,0.5)]' : 'bg-navy-300 border-navy-400'
                  }`}>
                    {isPast ? '✓' : isCurrent ? '★' : ''}
                  </div>
                  <span className={`text-[10px] ${isCurrent ? 'text-white font-bold' : isPast ? 'text-slate-500' : 'text-slate-700'}`}>{lvl.icon} {lvl.level}</span>
                  <span className="text-[9px] text-slate-700 ml-auto">{lvl.minXP.toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-violet-400" />
            <h3 className="font-bold text-white text-sm">7-Day Performance</h3>
          </div>
          <span className="text-[9px] text-slate-600">Avg: {(MOCK_DAILY.reduce((s, d) => s + d.score, 0) / MOCK_DAILY.length).toFixed(1)}</span>
        </div>
        <WeeklyChart data={MOCK_DAILY} uid="progress" />
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} className="text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Core Skills</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
          {[
            { label: 'Grammar', value: 72, color: '#7C3AED' },
            { label: 'Vocabulary', value: 65, color: '#F59E0B' },
            { label: 'Fluency', value: 81, color: '#10B981' },
            { label: 'Communication', value: 58, color: '#EC4899' },
          ].map(skill => (
            <div key={skill.label} className="flex flex-col items-center gap-1.5">
              <ProgressRing value={skill.value} size={65} strokeWidth={6} color={skill.color} label={`${skill.value}%`} />
              <span className="text-[9px] text-slate-600 font-medium">{skill.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

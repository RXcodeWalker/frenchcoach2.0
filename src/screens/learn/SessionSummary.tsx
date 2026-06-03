import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, Flame, Gem, ArrowRight, RotateCcw, Home, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ActiveSession, SkillProfile, TopicMasteryEntry } from '../../types';

interface SkillDelta {
  skillId: string;
  name: string;
  before: number;
  after: number;
  delta: number;
}

interface Props {
  session: ActiveSession;
  currentSkillProfile: SkillProfile;
  topicLabel: string;
  topicIcon: string;
  topicMastery: TopicMasteryEntry | null;
  onContinueTopic: () => void;
  onNewTopic: () => void;
  onHome: () => void;
}

function computeSkillDeltas(session: ActiveSession, current: SkillProfile): SkillDelta[] {
  return Object.entries(current)
    .map(([id, entry]) => {
      const before = session.skillSnapshot[id]?.score ?? 0;
      const after = entry.score;
      return { skillId: id, name: entry.name, before, after, delta: after - before };
    })
    .filter(d => Math.abs(d.delta) > 0.02)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);
}

function formatDuration(startedAt: string): string {
  const mins = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  return mins < 1 ? '<1 min' : `${mins} min`;
}

export function SessionSummary({
  session,
  currentSkillProfile,
  topicLabel,
  topicIcon,
  topicMastery,
  onContinueTopic,
  onNewTopic,
  onHome,
}: Props) {
  const deltas = computeSkillDeltas(session, currentSkillProfile);
  const completedQs = session.questions.filter(q => q.status === 'completed');
  const avgScore = completedQs.length > 0
    ? completedQs.reduce((a, q) => a + q.bestScore, 0) / completedQs.length
    : 0;

  const totalWords = session.questions.reduce(
    (a, q) => a + (q.attempts[q.attempts.length - 1]?.transcript?.split(/\s+/).filter(Boolean).length ?? 0),
    0
  );

  const allSavedVocab = session.questions.flatMap(q => q.savedVocab);

  const isExcellent = avgScore >= 8;
  const accentColor = isExcellent ? '#10B981' : avgScore >= 6 ? '#F59E0B' : '#EF4444';

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#06B6D4', '#0EA5E9', '#6366F1', '#A855F7', '#EC4899', '#F59E0B'],
      ticks: 400,
      gravity: 0.85,
    });
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-navy/90 backdrop-blur-2xl" />

      <motion.div
        className="relative z-10 w-full max-w-xl glass-elevated border-white/10 overflow-hidden my-auto"
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, opacity: 0.6 }} />

        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="text-3xl mb-2">{topicIcon}</div>
            <h2 className="text-2xl font-black text-white">Session Complete!</h2>
            <p className="text-slate-400 text-sm mt-1">
              {topicLabel} · {completedQs.length} questions · {formatDuration(session.startedAt)}
            </p>
          </div>

          {/* 4-stat grid */}
          <div className="grid grid-cols-4 gap-2">
            <StatTile
              icon={<span className="text-lg" style={{ color: accentColor }}>{avgScore.toFixed(1)}</span>}
              label="Avg Score"
            />
            <StatTile
              icon={<Zap size={16} className="text-emerald-400" />}
              label={`+${session.xpAccumulated} XP`}
            />
            <StatTile
              icon={<Flame size={16} className="text-orange-400" />}
              label={`🔥 ${session.bestStreak}`}
            />
            <StatTile
              icon={<Gem size={16} className="text-cyan-400" />}
              label={`+${session.gemsAccumulated}`}
            />
          </div>

          {/* Words spoken */}
          {totalWords > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl glass-subtle">
              <MessageSquare size={14} className="text-violet-400 flex-shrink-0" />
              <span className="text-sm text-slate-300">
                <span className="font-bold text-white">{totalWords}</span> words spoken this session
              </span>
            </div>
          )}

          {/* Skill deltas */}
          {deltas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Skills this session</p>
              {deltas.map(d => (
                <div key={d.skillId} className="flex items-center gap-3">
                  <p className="text-xs text-slate-400 w-28 truncate flex-shrink-0">{d.name}</p>
                  <div className="flex-1 relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(d.before * 100)}%`,
                        background: '#374151',
                      }}
                    />
                    <motion.div
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{ background: d.delta > 0 ? '#10B981' : '#EF4444' }}
                      initial={{ width: `${Math.round(d.before * 100)}%` }}
                      animate={{ width: `${Math.round(d.after * 100)}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-14 flex-shrink-0 justify-end">
                    {d.delta > 0
                      ? <TrendingUp size={10} className="text-emerald-400" />
                      : d.delta < 0
                      ? <TrendingDown size={10} className="text-rose-400" />
                      : <Minus size={10} className="text-slate-600" />
                    }
                    <span className={`text-[10px] font-bold ${d.delta > 0 ? 'text-emerald-400' : d.delta < 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                      {d.delta > 0 ? '+' : ''}{Math.round(d.delta * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved vocab */}
          {allSavedVocab.length > 0 && (
            <div className="p-3 rounded-xl glass-subtle space-y-1">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Saved vocabulary ({allSavedVocab.length})</p>
              <p className="text-sm text-slate-300">{allSavedVocab.join(' · ')}</p>
            </div>
          )}

          {/* Topic mastery badge */}
          {topicMastery?.mastered && (
            <motion.div
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-2xl mb-1">🏆</p>
              <p className="text-sm font-black text-amber-400">Topic Mastered!</p>
              <p className="text-xs text-amber-500/70 mt-0.5">{topicLabel} is now in your mastered collection</p>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <motion.button
              onClick={onContinueTopic}
              className="w-full btn-primary py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Continue {topicLabel} <ArrowRight size={16} />
            </motion.button>
            <div className="flex gap-2">
              <motion.button
                onClick={onNewTopic}
                className="flex-1 py-3 rounded-2xl glass-subtle text-white font-semibold text-sm flex items-center justify-center gap-2"
                whileTap={{ scale: 0.97 }}
              >
                <RotateCcw size={14} /> New topic
              </motion.button>
              <motion.button
                onClick={onHome}
                className="flex-1 py-3 rounded-2xl border border-white/8 hover:border-white/15 text-slate-500 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                whileTap={{ scale: 0.97 }}
              >
                <Home size={14} /> Home
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="p-3 rounded-xl glass-subtle text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <p className="text-[10px] font-bold text-slate-500 leading-tight">{label}</p>
    </div>
  );
}

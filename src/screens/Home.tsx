import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Zap, Flame, Target, Brain, Sparkles, Clock, TrendingUp, Trophy, Star, Quote } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRing';
import type { Screen } from '../types';

const DAILY_GOAL = 3;

const FRENCH_QUOTES = [
  { text: "La vie est belle quand on la regarde avec le coeur.", translation: "Life is beautiful when you look at it with the heart." },
  { text: "Chaque jour est une nouvelle chance de progresser.", translation: "Every day is a new chance to improve." },
  { text: "Le succès est la somme de petits efforts répétés.", translation: "Success is the sum of small efforts repeated." },
  { text: "Apprendre une langue, c'est ouvrir une fenetre sur le monde.", translation: "Learning a language is opening a window to the world." },
  { text: "La patience est la cle de toute reussite.", translation: "Patience is the key to all success." },
];

const MOCK_DAILY = [
  { day: 'Mon', score: 6.2 },
  { day: 'Tue', score: 7.1 },
  { day: 'Wed', score: 6.8 },
  { day: 'Thu', score: 7.9 },
  { day: 'Fri', score: 8.1 },
  { day: 'Sat', score: 7.4 },
  { day: 'Sun', score: 8.5 },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

export function Home() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const [todayCount] = useState(2);
  const [quote] = useState(() => FRENCH_QUOTES[Math.floor(Math.random() * FRENCH_QUOTES.length)]);

  const navigate = (screen: Screen) => dispatch({ type: 'SET_SCREEN', screen });
  const goalComplete = todayCount >= DAILY_GOAL;
  const maxScore = Math.max(...MOCK_DAILY.map(d => d.score));

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Good evening</p>
            <h1 className="text-2xl md:text-3xl font-black text-white">{profile.username}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border-orange-500/15">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{profile.streak_days}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border-violet-electric/15">
              <Zap size={14} className="text-violet-400" />
              <span className="text-xs font-bold text-violet-400">{profile.total_xp.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Hero: Today's Mission */}
        <motion.div variants={fadeUp}>
          <div className="relative overflow-hidden rounded-2xl glass-elevated border-violet-electric/15 p-6 md:p-8">
            <div className="absolute top-0 right-0 w-72 h-72 bg-violet-electric/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/4 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-violet-electric/8 blur-xl animate-pulse" />
                </div>
                <ProgressRing
                  value={todayCount}
                  max={DAILY_GOAL}
                  size={130}
                  strokeWidth={10}
                  color="#7C3AED"
                  label={`${todayCount}/${DAILY_GOAL}`}
                  sublabel="today"
                  glow
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-electric/10 border border-violet-electric/20 mb-3">
                  <Target size={11} className="text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Today's Mission</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-1.5">
                  {goalComplete ? 'Mission Complete' : `${DAILY_GOAL - todayCount} sessions to go`}
                </h2>
                <p className="text-slate-500 text-sm mb-4">
                  {goalComplete
                    ? 'You crushed it! Bonus XP earned.'
                    : 'Complete your daily goal to earn +50 bonus XP and keep your streak alive.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <motion.button
                    onClick={() => navigate('learn')}
                    className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Zap size={14} /> Start Learning <ChevronRight size={14} />
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('exam')}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/8 hover:border-white/15 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Clock size={13} /> Quick Exam
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Recommendation + Daily Motivation */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* AI Suggests */}
          <div className="relative overflow-hidden rounded-xl glass border-cyan-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
                <Brain size={15} className="text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">AI Suggests</span>
                  <Sparkles size={10} className="text-cyan-400" />
                </div>
                <p className="text-white font-semibold text-sm">Focus on <span className="text-cyan-300">Environment</span></p>
                <p className="text-[10px] text-slate-600 mt-0.5">3 sessions will boost your score by ~15%</p>
              </div>
              <motion.button
                onClick={() => navigate('learn')}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/8 border border-cyan-500/15 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/15 transition-all"
                whileTap={{ scale: 0.95 }}
              >
                Go
              </motion.button>
            </div>
          </div>

          {/* Daily Motivation */}
          <div className="relative overflow-hidden rounded-xl glass border-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/8 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Quote size={15} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Daily Motivation</span>
                <p className="text-white font-medium text-sm mt-0.5 italic leading-snug">{quote.text}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{quote.translation}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { icon: <Flame size={16} className="text-orange-400" />, value: profile.streak_days, label: 'Day Streak', border: 'border-orange-500/15' },
            { icon: <Zap size={16} className="text-violet-400" />, value: profile.total_xp.toLocaleString(), label: 'Total XP', border: 'border-violet-electric/15' },
            { icon: <TrendingUp size={16} className="text-emerald-fluency" />, value: '7.8', label: 'Avg Score', border: 'border-emerald-500/15' },
            { icon: <Trophy size={16} className="text-gold-achievement" />, value: state.achievements.filter(a => a.unlocked).length, label: 'Achievements', border: 'border-amber-500/15' },
          ].map(stat => (
            <motion.div
              key={stat.label}
              className={`rounded-xl glass ${stat.border} p-3.5 cursor-pointer`}
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-1.5">{stat.icon}</div>
              <p className="text-lg font-black text-white">{stat.value}</p>
              <p className="text-[10px] text-slate-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* 7-Day Performance Chart */}
        <motion.div variants={fadeUp} className="rounded-xl glass-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-violet-400" />
              <h3 className="font-bold text-white text-sm">7-Day Performance</h3>
            </div>
            <span className="text-[10px] text-slate-600">Avg: {(MOCK_DAILY.reduce((s, d) => s + d.score, 0) / MOCK_DAILY.length).toFixed(1)}</span>
          </div>
          {/* Area chart with gradient fill */}
          <div className="relative h-28">
            <svg className="w-full h-full" viewBox="0 0 700 112" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <path
                d={`M0,${112 - (MOCK_DAILY[0].score / maxScore) * 100} ${MOCK_DAILY.map((d, i) => {
                  const x = (i / (MOCK_DAILY.length - 1)) * 700;
                  const y = 112 - (d.score / maxScore) * 100;
                  return i === 0 ? `M0,${y}` : `C${x - 50},${y} ${x - 25},${y} ${x},${y}`;
                }).join(' ')} L700,112 L0,112 Z`}
                fill="url(#chartGrad)"
              />
              {/* Line */}
              <path
                d={MOCK_DAILY.map((d, i) => {
                  const x = (i / (MOCK_DAILY.length - 1)) * 700;
                  const y = 112 - (d.score / maxScore) * 100;
                  return i === 0 ? `M${x},${y}` : `C${x - 50},${y} ${x - 25},${y} ${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(124, 58, 237, 0.4))' }}
              />
              {/* Dots */}
              {MOCK_DAILY.map((d, i) => {
                const x = (i / (MOCK_DAILY.length - 1)) * 700;
                const y = 112 - (d.score / maxScore) * 100;
                return <circle key={i} cx={x} cy={y} r="3" fill="#7C3AED" style={{ filter: 'drop-shadow(0 0 3px rgba(124, 58, 237, 0.6))' }} />;
              })}
            </svg>
            {/* Day labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 translate-y-5">
              {MOCK_DAILY.map(d => (
                <span key={d.day} className="text-[9px] text-slate-700">{d.day}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Continue Learning + Daily Challenge */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <motion.button
            onClick={() => navigate('learn')}
            className="group relative overflow-hidden rounded-xl glass border-blue-500/10 p-5 text-left hover:border-blue-500/25 transition-all duration-300"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/8 border border-blue-500/15 flex items-center justify-center">
                  <Star size={12} className="text-blue-400" />
                </div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Continue</span>
              </div>
              <p className="text-white font-bold text-sm mb-0.5">School & Education</p>
              <p className="text-[10px] text-slate-600">Last: Score 7.8 — 2 questions left</p>
              <div className="mt-3 h-1 bg-navy-300 rounded-full overflow-hidden">
                <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shimmer-bar" />
              </div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => navigate('learn')}
            className="group relative overflow-hidden rounded-xl glass border-amber-500/10 p-5 text-left hover:border-amber-500/25 transition-all duration-300"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/3 rounded-full blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/8 border border-amber-500/15 flex items-center justify-center">
                  <Target size={12} className="text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Daily Challenge</span>
              </div>
              <p className="text-white font-bold text-sm mb-0.5">Describe your routine</p>
              <p className="text-[10px] text-slate-600">+35 XP bonus — 4h remaining</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1 bg-navy-300 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 shimmer-bar" />
                </div>
                <span className="text-[9px] font-bold text-amber-400">1/3</span>
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Quick Access */}
        <motion.div variants={fadeUp}>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Quick Access</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { icon: '📚', label: 'Practice', screen: 'learn' as Screen },
              { icon: '🎓', label: 'Exam', screen: 'exam' as Screen },
              { icon: '🧭', label: 'Explore', screen: 'explore' as Screen },
              { icon: '📊', label: 'Progress', screen: 'progress' as Screen },
              { icon: '💬', label: 'AI Chat', screen: 'learn' as Screen },
              { icon: '🏆', label: 'Rankings', screen: 'explore' as Screen },
            ].map(item => (
              <motion.button
                key={item.label}
                onClick={() => navigate(item.screen)}
                className="group flex flex-col items-center gap-1.5 p-3 rounded-xl glass-subtle hover:bg-white/[0.04] transition-all duration-200"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                <span className="text-[10px] font-semibold text-slate-600 group-hover:text-white transition-colors">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeUp}>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">Recent Activity</h3>
          <div className="space-y-1.5">
            {state.recentSessions.slice(0, 3).map(session => (
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
                  <p className="text-xs font-semibold text-white capitalize">{session.mode}</p>
                  <p className="text-[10px] text-slate-600 truncate">{session.topicKey ?? 'General'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-white">{session.score.toFixed(1)}<span className="text-[9px] text-slate-600">/10</span></p>
                  <p className="text-[9px] text-emerald-400 font-semibold">+{session.xpEarned} XP</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

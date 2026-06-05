import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Zap, TrendingUp, Trophy, Star, Target, Sparkles, Gem, ArrowRight, Play, BrainCircuit, AlertTriangle, ChevronRight } from 'lucide-react';
import { generateDailyPlan } from '../services/coach/decisionEngine';
import type { DailyPlan } from '../types/coach';
import { useApp } from '../context/AppContext';
import { MOCK_DAILY } from '../data/mocks/mockDaily';
import { fadeUp } from '../components/motion/variants';
import { WeeklyChart } from '../components/WeeklyChart';
import { PageShell } from '../components/layout/PageShell';
import { HeroMission } from './home/HeroMission';
import { DailyCards } from './home/DailyCards';
import { QuickAccess } from './home/QuickAccess';
import { RecentActivity } from './home/RecentActivity';
import { TopContextBar } from '../components/TopContextBar';
import { HookStack } from '../components/EngagementHooks';
import type { Screen } from '../types/index';

const FRENCH_QUOTES = [
  { text: "La vie est belle quand on la regarde avec le coeur.", translation: "Life is beautiful when you look at it with the heart." },
  { text: "Chaque jour est une nouvelle chance de progresser.", translation: "Every day is a new chance to improve." },
  { text: "Le succès est la somme de petits efforts répétés.", translation: "Success is the sum of small efforts repeated." },
  { text: "Apprendre une langue, c'est ouvrir une fenetre sur le monde.", translation: "Learning a language is opening a window to the world." },
  { text: "La patience est la cle de toute reussite.", translation: "Patience is the key to all success." },
];

export function Home() {
  const { state } = useApp();
  const { profile } = state;
  const navigate = useNavigate();
  const [todayCount] = useState(2);
  const [quote] = useState(() => FRENCH_QUOTES[Math.floor(Math.random() * FRENCH_QUOTES.length)]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    try {
      setDailyPlan(generateDailyPlan());
    } catch {
      // Non-critical — Home still renders without a coach plan
    }
  }, []);

  const [hooks, setHooks] = useState([
    { 
      type: 'streak' as const, 
      title: 'Streak at Risk!', 
      description: 'Your 7-day streak ends in 4 hours. Practice now!', 
      cta: 'Save My Streak', 
      onClick: () => navigate('/learn'),
      onClose: () => setHooks(h => h.slice(1))
    }
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopContextBar 
        title="Dashboard" 
        subtitle={`Welcome back, ${profile.username}`}
      />
      
      <PageShell>
        <div className="space-y-6 pb-24 md:pb-8">
          {/* Motivation Quote */}
          <motion.div 
            variants={fadeUp}
            className="glass border-white/5 rounded-2xl p-4 flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-electric/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Sparkles size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium italic text-slate-300">"{quote.text}"</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{quote.translation}</p>
            </div>
          </motion.div>

          <HeroMission todayCount={todayCount} onLearn={() => navigate('/learn')} onExam={() => navigate('/exam')} />

          {/* Today's AI Coach Card */}
          {dailyPlan && (
            <motion.div
              variants={fadeUp}
              onClick={() => navigate('/learn')}
              className={`group relative overflow-hidden rounded-2xl glass-elevated cursor-pointer border ${
                dailyPlan.urgency === 'exam_soon' ? 'border-red-500/30' :
                dailyPlan.urgency === 'streak_at_risk' ? 'border-orange-500/30' :
                dailyPlan.urgency === 'confidence_drop' ? 'border-yellow-500/30' :
                'border-violet-500/20'
              } p-5`}
              whileHover={{ scale: 1.01, translateY: -2 }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl group-hover:bg-violet-500/10 transition-colors" />
              <div className="relative z-10 flex items-start gap-4">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  dailyPlan.urgency !== 'none' ? 'bg-orange-500/10' : 'bg-violet-500/10'
                }`}>
                  {dailyPlan.urgency !== 'none'
                    ? <AlertTriangle size={18} className="text-orange-400" />
                    : <BrainCircuit size={18} className="text-violet-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                      Today's Coach
                    </span>
                    {dailyPlan.urgency !== 'none' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 uppercase tracking-wide">
                        {dailyPlan.urgency.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white font-semibold leading-snug line-clamp-2">
                    {dailyPlan.urgencyMessage ?? dailyPlan.explanation}
                  </p>
                  {dailyPlan.urgencyMessage && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{dailyPlan.explanation}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-violet-400 group-hover:gap-3 transition-all">
                    START SESSION <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Engagement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Action: Continue */}
            <motion.div
              variants={fadeUp}
              whileHover={{ scale: 1.01, translateY: -2 }}
              onClick={() => navigate('/learn')}
              className="group relative overflow-hidden rounded-2xl glass-elevated border-blue-500/20 p-6 cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Play size={18} className="text-blue-400 fill-blue-400/20" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Next Lesson</span>
                    <h3 className="text-white font-bold">School & Education</h3>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 font-medium">Progress</span>
                  <span className="text-blue-400 font-bold">60%</span>
                </div>
                <div className="h-2 bg-navy-300 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shimmer-bar" 
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-400 group-hover:gap-3 transition-all">
                  START NOW <ArrowRight size={12} />
                </div>
              </div>
            </motion.div>

            {/* Daily Challenge */}
            <motion.div
              variants={fadeUp}
              whileHover={{ scale: 1.01, translateY: -2 }}
              onClick={() => navigate('/learn')}
              className="group relative overflow-hidden rounded-2xl glass-elevated border-amber-500/20 p-6 cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Target size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Daily Challenge</span>
                    <h3 className="text-white font-bold">Describe your routine</h3>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-navy bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">
                        {i <= 1 ? '✅' : i}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">+35 XP Bonus</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-400 group-hover:gap-3 transition-all">
                  VIEW CHALLENGE <ArrowRight size={12} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* 7-Day Performance Chart */}
              <motion.div variants={fadeUp} className="rounded-2xl glass-elevated p-6 border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-violet-400" />
                    <h3 className="font-bold text-white text-base">Weekly Momentum</h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                    AVG SCORE: {(MOCK_DAILY.reduce((s, d) => s + d.score, 0) / MOCK_DAILY.length).toFixed(1)}
                  </div>
                </div>
                <WeeklyChart data={MOCK_DAILY} uid="home" />
              </motion.div>

              <RecentActivity sessions={state.recentSessions} />
            </div>

            <div className="space-y-6">
              {/* Stats Vertical Grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {[
                  { icon: <Flame size={18} />, value: profile.streak_days, label: 'Day Streak', color: 'text-orange-400', border: 'border-orange-500/20' },
                  { icon: <Zap size={18} />, value: profile.total_xp.toLocaleString(), label: 'Total XP', color: 'text-violet-400', border: 'border-violet-electric/20' },
                  { icon: <Star size={18} />, value: '7.8', label: 'Avg Score', color: 'text-emerald-400', border: 'border-emerald-500/20' },
                  { icon: <Trophy size={18} />, value: state.achievements.filter(a => a.unlocked).length, label: 'Badges', color: 'text-amber-400', border: 'border-amber-500/20' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className={`rounded-2xl glass p-4 border ${stat.border} group cursor-pointer overflow-hidden relative`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 group-hover:scale-150 transition-all duration-500">
                      {stat.icon}
                    </div>
                    <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>

              <QuickAccess onNavigate={(screen) => navigate(screen === 'home' ? '/' : `/${screen}`)} />
            </div>
          </div>
        </div>
      </PageShell>

      <HookStack hooks={hooks} />
    </div>
  );
}


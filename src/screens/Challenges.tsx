import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Target,
  Zap,
  Clock,
  Users,
  Star,
  ArrowLeft,
  Gift
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, dispatchAddXP } from '../context/AppContext';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'personal' | 'global' | 'weekly';
  reward: number;
  progress: number;
  goal: number;
  timeLeft?: string;
  status: 'active' | 'completed' | 'claimed';
  color: string;
}

const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: 'w1',
    title: 'Vocab Vanguard',
    description: 'Learn 50 new words this week',
    type: 'weekly',
    reward: 250,
    progress: 32,
    goal: 50,
    timeLeft: '4 days',
    status: 'active',
    color: '#7C3AED'
  },
  {
    id: 'w2',
    title: 'Speaking Streak',
    description: 'Complete 10 Speaking Arena matches',
    type: 'weekly',
    reward: 400,
    progress: 10,
    goal: 10,
    timeLeft: '4 days',
    status: 'completed',
    color: '#EF4444'
  },
  {
    id: 'w3',
    title: 'Exam Master',
    description: 'Score 90% or higher on an Exam Simulation',
    type: 'weekly',
    reward: 500,
    progress: 0,
    goal: 1,
    timeLeft: '4 days',
    status: 'active',
    color: '#F59E0B'
  }
];

const GLOBAL_CHALLENGE = {
  title: 'Community Carnival',
  description: 'Translate 1,000,000 words collectively',
  progress: 745230,
  goal: 1000000,
  reward: 'Exclusive "Carnival" Avatar Frame',
  participants: 12450
};

export function Challenges() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'weekly' | 'global'>('weekly');

  const userXpThisWeek = 2450; // Mock weekly XP

  const handleClaim = () => {
    // In a real app, this would update the backend
    dispatchAddXP(dispatch, 400, 'challenge');
    // Update local state for immediate feedback
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white transition-colors md:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Swords size={14} className="text-rose-500" />
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Battlefield</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Challenges</h1>
              <p className="text-sm text-slate-500 mt-1">Push your limits and earn massive rewards</p>
            </div>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
                activeTab === 'weekly' ? 'bg-rose-500/10 text-rose-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Star size={14} /> WEEKLY
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
                activeTab === 'global' ? 'bg-rose-500/10 text-rose-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users size={14} /> GLOBAL
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'weekly' && (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Weekly Progress Overview */}
              <div className="glass-elevated p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock size={120} className="text-white" />
                </div>
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">Weekly Marathon</h2>
                    <p className="text-xs text-slate-500">Challenges reset in 3 days 14 hours</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-600 uppercase">Weekly XP</p>
                      <p className="text-xl font-black text-white">{userXpThisWeek} XP</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                      <Zap size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Challenge Cards */}
              <div className="grid grid-cols-1 gap-4">
                {WEEKLY_CHALLENGES.map(challenge => (
                  <div 
                    key={challenge.id}
                    className="glass-elevated p-6 rounded-2xl border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${challenge.color}15`, border: `1px solid ${challenge.color}30` }}
                      >
                        {challenge.status === 'completed' || challenge.status === 'claimed' ? (
                          <CheckCircle className="text-emerald-400" size={28} />
                        ) : (
                          <Target style={{ color: challenge.color }} size={28} />
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-white">{challenge.title}</h3>
                            <p className="text-xs text-slate-500">{challenge.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-amber-400">+{challenge.reward} XP</p>
                            <p className="text-[9px] text-slate-600 font-medium">{challenge.timeLeft} left</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-600">Progress</span>
                            <span className="text-white">{challenge.progress} / {challenge.goal}</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full rounded-full"
                              style={{ backgroundColor: challenge.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(challenge.progress / challenge.goal) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={challenge.status === 'active' || challenge.status === 'claimed'}
                        onClick={() => handleClaim()}
                        className={`w-full md:w-32 py-3 rounded-xl font-black text-[10px] uppercase italic tracking-wider transition-all ${
                          challenge.status === 'completed' 
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:scale-105' 
                            : challenge.status === 'claimed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                            : 'bg-white/5 text-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {challenge.status === 'claimed' ? 'CLAIMED' : 'CLAIM XP'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'global' && (
            <motion.div
              key="global"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="glass-elevated p-8 rounded-3xl text-center space-y-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
                
                <div className="relative space-y-4">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                    <Users size={40} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{GLOBAL_CHALLENGE.title}</h2>
                    <p className="text-slate-400 max-w-md mx-auto">{GLOBAL_CHALLENGE.description}</p>
                  </div>
                </div>

                <div className="relative space-y-4 max-w-xl mx-auto">
                  <div className="flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Progress</p>
                      <p className="text-2xl font-black text-white tracking-tight">{GLOBAL_CHALLENGE.progress.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Goal</p>
                      <p className="text-lg font-bold text-blue-400">{GLOBAL_CHALLENGE.goal.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="h-4 bg-white/5 rounded-full p-1 border border-white/5">
                    <motion.div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-400 shadow-[0_0_15px_rgba(37,99,235,0.3)] shimmer-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${(GLOBAL_CHALLENGE.progress / GLOBAL_CHALLENGE.goal) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-center gap-8 pt-4">
                    <div className="text-center">
                      <p className="text-xl font-black text-white">{GLOBAL_CHALLENGE.participants.toLocaleString()}</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">Contributors</p>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="text-center">
                      <p className="text-xl font-black text-emerald-400">74.5%</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">Complete</p>
                    </div>
                  </div>
                </div>

                <div className="relative p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                      <Gift size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-400 uppercase">Unlocks at 1M words</p>
                      <p className="text-sm font-bold text-white">{GLOBAL_CHALLENGE.reward}</p>
                    </div>
                  </div>
                  <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs italic tracking-tighter transition-all shadow-lg shadow-blue-600/20">
                    CONTRIBUTE NOW
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function CheckCircle({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      className={className} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

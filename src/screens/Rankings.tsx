import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Globe, Clock, Flame, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { MOCK_RANKINGS, LEAGUES_ORDER } from '../data/mocks/mockRankings';
import { MOCK_FRIENDS } from '../data/mocks/mockFriends';
import { RankingUser } from '../types';

type Tab = 'leagues' | 'global' | 'friends';
type Timeframe = 'weekly' | 'all-time';

export function Rankings() {
  const [activeTab, setActiveTab] = useState<Tab>('leagues');
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');

  const currentUser = MOCK_RANKINGS.find(u => u.isCurrentUser);
  const currentLeagueInfo = LEAGUES_ORDER.find(l => l.league === currentUser?.currentLeague);

  const displayUsers = useMemo(() => {
    let users: RankingUser[] = [];

    if (activeTab === 'leagues') {
      // Filter by current league and sort by weekly XP
      users = MOCK_RANKINGS.filter(u => u.currentLeague === currentUser?.currentLeague)
        .sort((a, b) => b.weeklyXP - a.weeklyXP);
    } else if (activeTab === 'global') {
      // Sort all users by selected timeframe
      users = [...MOCK_RANKINGS].sort((a, b) => 
        timeframe === 'weekly' ? b.weeklyXP - a.weeklyXP : b.totalXP - a.totalXP
      );
    } else {
      // Combine current user and friends
      const friendsAsRankingUsers: RankingUser[] = MOCK_FRIENDS.map(f => ({
        id: f.id,
        username: f.username,
        avatar: f.avatar || '👤',
        totalXP: f.total_xp,
        weeklyXP: Math.floor(f.total_xp * 0.15), // Mock weekly XP
        currentLeague: 'Bronze' as const, // Mock
        streak: f.streak,
      }));
      
      users = [currentUser!, ...friendsAsRankingUsers].sort((a, b) => 
        timeframe === 'weekly' ? b.weeklyXP - a.weeklyXP : b.totalXP - a.totalXP
      );
    }

    return users.map((u, i) => ({ ...u, rank: i + 1 }));
  }, [activeTab, timeframe, currentUser]);

  return (
    <PageShell>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={14} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Hall of Fame</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Rankings</h1>
        <p className="text-sm text-slate-500 mt-1">Compete with learners worldwide</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-navy-300/50 rounded-xl mb-6">
        {(['leagues', 'global', 'friends'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-violet-electric text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'leagues' && <Shield size={14} />}
            {tab === 'global' && <Globe size={14} />}
            {tab === 'friends' && <Users size={14} />}
            <span className="capitalize">{tab}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* League Info Card (Only for Leagues tab) */}
        {activeTab === 'leagues' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-6 border border-white/5"
            style={{ 
              background: `linear-gradient(135deg, ${currentLeagueInfo?.color}15 0%, transparent 100%)`
            }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield size={100} color={currentLeagueInfo?.color} />
            </div>
            
            <div className="relative z-10 flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: currentLeagueInfo?.color }}
              >
                <Shield size={32} className="text-navy" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{currentUser?.currentLeague} League</h3>
                <p className="text-xs text-slate-500 font-medium">Top 5 move to the next league</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ends in</p>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-violet-400" />
                  <p className="text-sm font-bold text-white">2d 14h 22m</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Your Rank</p>
                <div className="flex items-center gap-2">
                  <Trophy size={12} className="text-amber-400" />
                  <p className="text-sm font-bold text-white">#5 <span className="text-[10px] text-emerald-400 font-medium">(Promoted)</span></p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timeframe Toggle (For Global/Friends) */}
        {activeTab !== 'leagues' && (
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white capitalize">{activeTab} Leaderboard</h3>
            <div className="flex p-1 bg-navy-300/30 rounded-lg">
              {(['weekly', 'all-time'] as Timeframe[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    timeframe === t
                      ? 'bg-white/10 text-white'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {t === 'weekly' ? 'Weekly' : 'All-Time'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2 pb-24">
          <AnimatePresence mode="popLayout">
            {displayUsers.map((user, index) => {
              const isPromoted = activeTab === 'leagues' && user.rank! <= 5;
              const isDemoted = activeTab === 'leagues' && user.rank! > displayUsers.length - 3;
              
              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.03 }}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl transition-all ${
                    user.isCurrentUser 
                      ? 'bg-violet-electric/10 border border-violet-electric/30' 
                      : 'glass hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-6 text-center">
                    {user.rank === 1 ? (
                      <span className="text-xl">🥇</span>
                    ) : user.rank === 2 ? (
                      <span className="text-xl">🥈</span>
                    ) : user.rank === 3 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className="text-sm font-black text-slate-600 group-hover:text-slate-400">
                        {user.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-navy-300 flex items-center justify-center text-xl border-2 border-white/5">
                      {user.avatar}
                    </div>
                    {user.streak > 50 && (
                      <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5 border border-navy shadow-lg">
                        <Flame size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${user.isCurrentUser ? 'text-white' : 'text-slate-200'}`}>
                      {user.username} {user.isCurrentUser && <span className="text-[10px] text-violet-400">(You)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Flame size={10} className="text-orange-400" />
                        <span className="text-[10px] font-medium text-slate-500">{user.streak}d</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield size={10} className="text-slate-600" />
                        <span className="text-[10px] font-medium text-slate-500">{user.currentLeague}</span>
                      </div>
                    </div>
                  </div>

                  {/* XP & Movement */}
                  <div className="text-right">
                    <p className="text-sm font-black text-white">
                      {(timeframe === 'weekly' || activeTab === 'leagues') 
                        ? user.weeklyXP.toLocaleString() 
                        : user.totalXP.toLocaleString()}
                      <span className="text-[10px] font-bold text-slate-600 ml-1">XP</span>
                    </p>
                    {activeTab === 'leagues' && (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {isPromoted ? (
                          <>
                            <TrendingUp size={10} className="text-emerald-400" />
                            <span className="text-[8px] font-bold text-emerald-400 uppercase">Promotion</span>
                          </>
                        ) : isDemoted ? (
                          <>
                            <TrendingDown size={10} className="text-rose-400" />
                            <span className="text-[8px] font-bold text-rose-400 uppercase">Demotion</span>
                          </>
                        ) : (
                          <>
                            <Minus size={10} className="text-slate-600" />
                            <span className="text-[8px] font-bold text-slate-600 uppercase">Stay</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky User Position (if not in top results) */}
      <AnimatePresence>
        {!displayUsers.find(u => u.isCurrentUser && u.rank! <= 8) && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-40"
          >
            <div className="glass-elevated border-violet-electric/50 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
               <div className="w-6 text-center text-sm font-black text-white">
                 #{displayUsers.find(u => u.isCurrentUser)?.rank}
               </div>
               <div className="w-10 h-10 rounded-full bg-violet-electric flex items-center justify-center text-xl border-2 border-white/20">
                 {currentUser?.avatar}
               </div>
               <div className="flex-1">
                 <p className="text-sm font-bold text-white">Your Rank</p>
                 <p className="text-[10px] text-violet-300">Keep practicing to move up!</p>
               </div>
               <div className="text-right">
                 <p className="text-sm font-black text-white">
                   {timeframe === 'weekly' ? currentUser?.weeklyXP.toLocaleString() : currentUser?.totalXP.toLocaleString()}
                   <span className="text-[10px] text-slate-400 ml-1">XP</span>
                 </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

export default Rankings;

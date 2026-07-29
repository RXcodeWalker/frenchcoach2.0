import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Swords, Search, UserPlus, Clock, Zap, Flame,
  ChevronRight, Share2, MoreHorizontal, BarChart2, X, TrendingUp,
  Sparkles, Heart, MessageSquare, Target, Shield, Coins, Star, Plus
} from 'lucide-react';
import { MOCK_FRIENDS, MOCK_CHALLENGES, MOCK_ACTIVITY_FEED } from '../data/mocks/mockFriends';
import { useApp } from '../context/AppContext';
import { Friend, FriendChallenge, ActivityFeedItem } from '../types';

export function FriendChallenges() {
  const [activeTab, setActiveTab] = useState<'duels' | 'co-op' | 'feed' | 'friends'>('duels');
  const [searchQuery, setSearchQuery] = useState('');
  const [comparingFriendId, setComparingFriendId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vsChallengeId, setVsChallengeId] = useState<string | null>(null);
  const [activeTaunt, setActiveTaunt] = useState<{ id: string; emoji: string; text: string } | null>(null);

  const handleStartDuel = (id: string) => {
    setVsChallengeId(id);
    setTimeout(() => {
      // In a real app, this would navigate to the session
      // For now, we just clear the splash after 3 seconds
      setVsChallengeId(null);
    }, 3000);
  };

  const sendTaunt = (challengeId: string, emoji: string, text: string) => {
    setActiveTaunt({ id: challengeId, emoji, text });
    setTimeout(() => setActiveTaunt(null), 3000);
  };

  const filteredFriends = MOCK_FRIENDS.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDuels = MOCK_CHALLENGES.filter(c => 
    c.status === 'active' && 
    !c.type.includes('co_op') && 
    c.type !== 'daily_quest' && 
    c.type !== 'boss_raid'
  );

  const activeCoops = MOCK_CHALLENGES.filter(c => 
    c.status === 'active' && (c.type.includes('co_op') || c.type === 'boss_raid')
  );

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Social Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">FRIEND CHALLENGES</h1>
            <p className="text-sm text-slate-500 mt-1">Compete, collaborate, and climb together</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start overflow-x-auto max-w-full">
            {[
              { id: 'duels', label: 'DUELS', icon: Swords },
              { id: 'co-op', label: 'CO-OP', icon: Heart },
              { id: 'feed', label: 'FEED', icon: MessageSquare },
              { id: 'friends', label: 'FRIENDS', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'duels' | 'co-op' | 'feed' | 'friends')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Pair Quest Widget */}
        {(activeTab === 'duels' || activeTab === 'co-op') && (
           <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4"
           >
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/30">
                 <Star size={24} className="animate-pulse" />
               </div>
               <div>
                 <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">DAILY PAIR QUEST</p>
                 <h3 className="text-sm font-bold text-white">Complete 2 Exam Roleplays with a friend</h3>
                 <div className="flex items-center gap-2 mt-1">
                   <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full w-1/2 bg-amber-500" />
                   </div>
                   <span className="text-[10px] text-slate-400 font-bold">1/2</span>
                 </div>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="text-right hidden md:block">
                 <p className="text-[10px] font-bold text-slate-500 uppercase">REWARD</p>
                 <p className="text-xs font-black text-emerald-400">+250 XP • 10 💎</p>
               </div>
               <button className="px-4 py-2 bg-white text-slate-950 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-colors italic">
                 INVITE
               </button>
             </div>
           </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'duels' && (
            <motion.div
              key="duels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Duels</h2>
                <button className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:underline">
                  <Clock size={12} /> History
                </button>
              </div>

              {activeDuels.map(challenge => (
                <ChallengeCard 
                  key={challenge.id} 
                  challenge={challenge} 
                  isCoop={false} 
                  onStartDuel={handleStartDuel}
                  onSendTaunt={sendTaunt}
                  activeTaunt={activeTaunt?.id === challenge.id ? activeTaunt : null}
                />
              ))}

              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-6 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-blue-500/20 hover:text-blue-400 transition-all group"
              >
                <Swords size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">Challenge a Friend</span>
              </button>
            </motion.div>
          )}

          {activeTab === 'co-op' && (
            <motion.div
              key="co-op"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ongoing Collaborations</h2>
                <div className="p-2 bg-emerald-500/10 rounded-lg flex items-center gap-2">
                  <Shield size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400">CO-OP MULTIPLIER: 1.2x</span>
                </div>
              </div>

              {activeCoops.length > 0 ? (
                activeCoops.map(challenge => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge} 
                    isCoop={true} 
                    onStartDuel={handleStartDuel}
                    onSendTaunt={sendTaunt}
                    activeTaunt={activeTaunt?.id === challenge.id ? activeTaunt : null}
                  />
                ))
              ) : (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                  <Heart size={32} className="text-slate-800 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600 italic">No active collaborations. Team up to reach goals faster!</p>
                </div>
              )}

              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-6 border-2 border-dashed border-emerald-500/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-emerald-500/20 hover:text-emerald-400 transition-all group"
              >
                <Heart size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">Start Co-op Goal</span>
              </button>
            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
               <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h2>
                <button className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:underline">
                  Mark all read
                </button>
              </div>

              <div className="space-y-3">
                {MOCK_ACTIVITY_FEED.map(item => (
                  <ActivityFeedCard key={item.id} item={item} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="text"
                  placeholder="Find friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFriends.map(friend => (
                  <FriendCard 
                    key={friend.id} 
                    friend={friend} 
                    onCompare={() => setComparingFriendId(friend.id)}
                  />
                ))}
              </div>

              <div className="pt-4 flex flex-col items-center gap-4">
                <p className="text-xs text-slate-600 italic">Can't find your friends?</p>
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                    <Share2 size={16} /> Invite Friends
                  </button>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
                    <UserPlus size={16} /> Sync Contacts
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {comparingFriendId && (
          <ComparisonModal 
            friend={MOCK_FRIENDS.find(f => f.id === comparingFriendId)!} 
            onClose={() => setComparingFriendId(null)} 
          />
        )}
        {isCreateModalOpen && (
          <CreateChallengeModal onClose={() => setIsCreateModalOpen(false)} />
        )}
        {vsChallengeId && (
          <VsSplash 
            challenge={MOCK_CHALLENGES.find(c => c.id === vsChallengeId)!} 
            onClose={() => setVsChallengeId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VsSplash({ challenge }: { challenge: FriendChallenge; onClose: () => void }) {
  const { state } = useApp();
  const friend = MOCK_FRIENDS.find(f => f.id === challenge.friendId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-950 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent opacity-50" />
      
      {/* User Side */}
      <motion.div 
        initial={{ x: '-100%', skewX: -10 }}
        animate={{ x: '-10%', skewX: -10 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-blue-600/40 to-blue-400/10 border-r-4 border-blue-500/50 flex items-center justify-center pr-[10%]"
      >
        <div className="skew-x-[10deg] flex flex-col items-center gap-6">
          <div className="w-48 h-48 rounded-3xl bg-blue-500/20 border-2 border-blue-400/50 flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(59,130,246,0.5)]">
            ⚡
          </div>
          <div className="text-center">
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{state.profile.username}</h2>
            <p className="text-blue-400 font-bold tracking-[0.3em] mt-2">CHALLENGER</p>
          </div>
        </div>
      </motion.div>

      {/* Friend Side */}
      <motion.div 
        initial={{ x: '100%', skewX: -10 }}
        animate={{ x: '10%', skewX: -10 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-purple-600/40 to-purple-400/10 border-l-4 border-purple-500/50 flex items-center justify-center pl-[10%]"
      >
        <div className="skew-x-[10deg] flex flex-col items-center gap-6">
          <div className="w-48 h-48 rounded-3xl bg-purple-500/20 border-2 border-purple-400/50 flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(168,85,247,0.5)] text-white">
            {friend?.username[0]}
          </div>
          <div className="text-center">
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{friend?.username}</h2>
            <p className="text-purple-400 font-bold tracking-[0.3em] mt-2">OPPONENT</p>
          </div>
        </div>
      </motion.div>

      {/* VS Text */}
      <motion.div 
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: 'spring', damping: 10 }}
        className="relative z-10 w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.4)]"
      >
        <span className="text-6xl font-black text-navy-950 italic">VS</span>
      </motion.div>

      {/* Start Banner */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2"
      >
        <div className="bg-white px-12 py-4 rounded-2xl shadow-2xl">
          <p className="text-2xl font-black text-navy-950 italic tracking-tighter animate-bounce">FIGHT!</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChallengeCard({ challenge, isCoop, onStartDuel, onSendTaunt, activeTaunt }: { 
  challenge: FriendChallenge; 
  isCoop: boolean;
  onStartDuel?: (id: string) => void;
  onSendTaunt?: (id: string, emoji: string, text: string) => void;
  activeTaunt?: { emoji: string; text: string } | null;
}) {
  const friend = MOCK_FRIENDS.find(f => f.id === challenge.friendId);
  const totalProgress = challenge.userProgress + challenge.friendProgress;
  const isBossRaid = challenge.type === 'boss_raid';
  const goal = challenge.targetGoal || Math.max(challenge.userProgress, challenge.friendProgress, 1);
  
  const userPercent = (challenge.userProgress / goal) * 100;
  const friendPercent = (challenge.friendProgress / goal) * 100;
  const combinedPercent = (totalProgress / (challenge.targetGoal || 1)) * 100;

  const taunts = [
    { emoji: '💨', text: 'Catch me if you can!' },
    { emoji: '🎯', text: 'On target!' },
    { emoji: '🤝', text: 'We got this!' },
    { emoji: '🔥', text: 'Im on fire!' }
  ];

  return (
    <motion.div
      className={`glass-elevated p-6 rounded-2xl border-white/5 relative overflow-hidden group ${isCoop ? 'border-emerald-500/20' : ''} ${isBossRaid ? 'border-amber-500/20' : ''}`}
      whileHover={{ scale: 1.01 }}
    >
      {/* Background flair for Boss Raid */}
      {isBossRaid && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
      )}

      {/* Active Taunt Overlay */}
      <AnimatePresence>
        {activeTaunt && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-4 right-4 z-20 bg-white text-navy-950 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2"
          >
            <span className="text-xl">{activeTaunt.emoji}</span>
            <span className="text-[10px] font-bold uppercase italic">{activeTaunt.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
        {/* Challenge Type & Status */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 min-w-[120px]">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover:rotate-3 ${
            isBossRaid ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
            isCoop ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {challenge.type === 'xp_race' ? <Zap size={28} /> : 
             challenge.type === 'co_op_xp' ? <Heart size={28} /> :
             challenge.type === 'skill_duel' ? <Target size={28} /> :
             challenge.type === 'boss_raid' ? <Sparkles size={28} /> :
             <Flame size={28} />}
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase italic ${isBossRaid ? 'text-amber-400' : 'text-white'}`}>
              {challenge.type.replace(/_/g, ' ')}
            </p>
            {challenge.skillTarget && (
              <p className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">
                {challenge.skillTarget}
              </p>
            )}
          </div>
        </div>

        {/* Progress Comparison / Collaborative Progress */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-white">You</span>
              <span className="text-slate-500">{challenge.userProgress} {challenge.type === 'skill_duel' ? 'PTS' : 'XP'}</span>
            </div>
            {isBossRaid ? (
              <div className="flex items-center gap-2">
                <span className="text-amber-400">BOSS: {goal - totalProgress} HP</span>
                <span className="text-slate-500">/{goal}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{challenge.friendProgress} {challenge.type === 'skill_duel' ? 'PTS' : 'XP'}</span>
                <span className="text-blue-400">{friend?.username}</span>
              </div>
            )}
          </div>

          <div className="h-4 bg-white/5 rounded-full overflow-hidden flex border border-white/5 p-0.5">
            {isCoop || isBossRaid ? (
              <motion.div 
                className={`h-full rounded-full shadow-lg ${
                  isBossRaid ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(combinedPercent, 100)}%` }}
              />
            ) : (
              <>
                <motion.div 
                  className="h-full bg-emerald-500 rounded-l-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${userPercent}%` }}
                />
                <motion.div 
                  className="h-full bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${friendPercent}%` }}
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock size={12} />
              <span>Expires in 2 days</span>
            </div>
            <div className="flex items-center gap-3">
              {challenge.wagerGems && (
                 <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Coins size={10} className="text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400">{challenge.wagerGems * 2} STAKE</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase">REWARD:</span>
                {challenge.rewardType === 'loot_box' ? (
                  <div className="flex items-center gap-1 text-purple-400 animate-pulse">
                    <Star size={12} />
                    <span className="text-[10px] font-black">MYSTERY BOX</span>
                  </div>
                ) : (
                  <span className={`text-[10px] font-black ${isCoop ? 'text-emerald-400' : isBossRaid ? 'text-amber-400' : 'text-amber-400'}`}>
                    {challenge.rewardXP} XP
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <button 
            onClick={() => onStartDuel?.(challenge.id)}
            className={`w-full px-8 py-3 font-black rounded-xl transition-all text-xs italic tracking-tighter shadow-xl ${
              isBossRaid ? 'bg-amber-500 text-navy-950 hover:bg-amber-400 shadow-amber-500/20' :
              isCoop ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20' : 
              'bg-white text-slate-950 hover:bg-slate-200'
            }`}
          >
            {isCoop || isBossRaid ? 'CONTRIBUTE' : 'PLAY NOW'}
          </button>
          
          <div className="flex gap-2">
            <div className="relative group/taunt flex-1">
              <button className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                {isCoop || isBossRaid ? 'CHEER' : 'TAUNT'}
              </button>
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-navy-900 border border-white/10 rounded-xl flex gap-1.5 shadow-2xl opacity-0 invisible group-hover/taunt:opacity-100 group-hover/taunt:visible transition-all">
                {taunts.map(t => (
                  <button 
                    key={t.text} 
                    onClick={() => onSendTaunt?.(challenge.id, t.emoji, t.text)}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-xl transition-transform hover:scale-110" 
                    title={t.text}
                  >
                    {t.emoji}
                  </button>
                ))}
              </div>
            </div>
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActivityFeedCard({ item }: { item: ActivityFeedItem }) {
  const friend = MOCK_FRIENDS.find(f => f.id === item.friendId);
  const [reactions, setReactions] = useState(item.reactions);

  const addReaction = (emoji: string) => {
    setReactions(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1
    }));
  };

  return (
    <div className="glass-elevated p-4 rounded-2xl border-white/5 flex items-start gap-4 hover:border-white/10 transition-colors group">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center border border-white/10 overflow-hidden flex-shrink-0">
        <span className="text-sm font-black text-white">{friend?.username[0]}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{friend?.username}</span>
          <span className="text-[10px] text-slate-600 uppercase font-bold">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-sm text-slate-400 leading-tight mb-3">
          {item.content}
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(reactions).map(([emoji, count]) => (
            <button 
              key={emoji}
              onClick={() => addReaction(emoji)}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="text-xs">{emoji}</span>
              <span className="text-[10px] font-black text-slate-500">{count}</span>
            </button>
          ))}
          <div className="relative group/react">
            <button className="flex items-center justify-center w-7 h-7 bg-white/5 border border-dashed border-white/10 rounded-lg text-slate-600 hover:text-blue-400 hover:border-blue-500/30 transition-all">
              <Plus size={14} />
            </button>
            <div className="absolute left-0 bottom-full mb-2 bg-navy-900 border border-white/10 p-1.5 rounded-xl flex gap-1.5 shadow-2xl opacity-0 invisible group-hover/react:opacity-100 group-hover/react:visible transition-all">
              {['🔥', '🙌', '🎯', '⚡', '❤️'].map(e => (
                <button key={e} onClick={() => addReaction(e)} className="hover:scale-125 transition-transform text-lg">{e}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendCard({ friend, onCompare }: { friend: Friend; onCompare: () => void }) {
  return (
    <div className="glass-elevated p-4 rounded-2xl border-white/5 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
            <span className="text-lg font-black text-white">{friend.username[0]}</span>
          </div>
          {friend.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">{friend.username}</h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
            <span className="text-blue-400">{friend.level}</span>
            <span>•</span>
            <span>{friend.total_xp} XP</span>
            <span>•</span>
            <span className="text-orange-400 flex items-center gap-0.5"><Flame size={10} /> {friend.streak}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onCompare}
          className="p-2.5 bg-white/5 text-slate-500 rounded-xl hover:bg-violet-500/10 hover:text-violet-400 transition-all border border-transparent hover:border-violet-500/20"
          title="Compare Progress"
        >
          <BarChart2 size={16} />
        </button>
        <button className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/5">
          <Swords size={16} />
        </button>
      </div>
    </div>
  );
}

function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [, setChallengeType] = useState<'versus' | 'co-op'>('versus');
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6"
    >
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-navy-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-xl font-black text-white italic tracking-tighter">NEW CHALLENGE</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        
        <div className="p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">SELECT MODE</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setChallengeType('versus'); setStep(2); }}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group text-center"
                >
                  <Swords size={32} className="text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-black text-white italic">VERSUS</p>
                  <p className="text-[10px] text-slate-500 mt-1">Compete head-to-head</p>
                </button>
                <button 
                  onClick={() => { setChallengeType('co-op'); setStep(2); }}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group text-center"
                >
                  <Heart size={32} className="text-emerald-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-black text-white italic">CO-OP</p>
                  <p className="text-[10px] text-slate-500 mt-1">Work together for a goal</p>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
               <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SELECT CHALLENGE TYPE</p>
                <div className="grid grid-cols-1 gap-2">
                  {['XP Race', 'Skill Duel', 'Streak War'].map(type => (
                    <button key={type} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all flex items-center justify-between group">
                      <span className="text-sm font-bold text-white italic">{type.toUpperCase()}</span>
                      <ChevronRight size={16} className="text-slate-700 group-hover:text-white" />
                    </button>
                  ))}
                </div>
               </div>

               <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WAGER GEMS (OPTIONAL)</p>
                   <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><Coins size={12} /> 1,240</span>
                 </div>
                 <div className="flex gap-2">
                   {[0, 10, 50, 100].map(amt => (
                     <button key={amt} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-white hover:bg-amber-500/10 hover:border-amber-500/30 transition-all">
                       {amt === 0 ? 'NONE' : `${amt} 💎`}
                     </button>
                   ))}
                 </div>
               </div>

               <button 
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all italic tracking-tighter"
               >
                 SEND CHALLENGE
               </button>
               <button onClick={() => setStep(1)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">Back</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ComparisonModal({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const { state } = useApp();
  const { profile } = state;
  const [socialActionSent, setSocialActionSent] = useState<string | null>(null);

  const compareStats = [
    { label: 'Total XP', user: profile.total_xp, friend: friend.total_xp, format: (v: number) => v.toLocaleString() },
    { label: 'Streak', user: profile.streak_days, friend: friend.streak, format: (v: number) => `${v}d` },
    { label: 'Level', user: profile.current_level, friend: friend.level, isText: true },
    { label: 'Achievements', user: state.achievements.filter(a => a.unlocked).length, friend: friend.achievementsCount || 0 },
  ];

  const skillData = [
    { label: 'Grammar', user: 7.8, friend: friend.skills?.grammar || 0 },
    { label: 'Fluency', user: 6.5, friend: friend.skills?.fluency || 0 },
    { label: 'Vocabulary', user: 8.2, friend: friend.skills?.vocabulary || 0 },
    { label: 'Pronunciation', user: 7.0, friend: friend.skills?.pronunciation || 0 },
    { label: 'Listening', user: 7.5, friend: friend.skills?.listening || 0 },
  ];

  const handleSocialAction = (type: string) => {
    setSocialActionSent(type);
    setTimeout(() => setSocialActionSent(null), 2000);
  };

  const getAIMessage = () => {
    const userAvg = skillData.reduce((acc, s) => acc + s.user, 0) / skillData.length;
    const friendAvg = skillData.reduce((acc, s) => acc + s.friend, 0) / skillData.length;
    
    if (userAvg > friendAvg + 1) return `You're significantly ahead in overall mastery! Marie might need some tips from you.`;
    if (friendAvg > userAvg + 1) return `${friend.username} is currently in the lead. Focus on your ${skillData.sort((a,b) => a.user - b.user)[0].label} to close the gap!`;
    return `It's a close match! You're stronger in ${skillData.sort((a,b) => b.user - a.user)[0].label}, while ${friend.username} excels in ${skillData.sort((a,b) => b.friend - a.friend)[0].label}.`;
  };

  const getCoopStrategy = () => {
    return `Team up for a Grammar Co-op Challenge! Your strong grammar combined with ${friend.username}'s high fluency makes you a perfect pair for the advanced roleplays.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
    >
      <motion.div 
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-navy-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
              <Swords size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic tracking-tighter uppercase">Head to Head</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Comparison 2.0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Hero Comparison */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/30 text-3xl shadow-2xl shadow-violet-500/20">
                  ⚡
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-lg px-1.5 py-0.5 border border-navy-900 shadow-lg">
                  <span className="text-[8px] font-black text-white">#4</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white">{profile.username}</p>
                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded-full">YOU</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-inner">VS</div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mt-2" />
            </div>

            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30 text-3xl shadow-2xl shadow-blue-500/20 text-white">
                  {friend.username[0]}
                </div>
                <div className="absolute -bottom-2 -left-2 bg-blue-500 rounded-lg px-1.5 py-0.5 border border-navy-900 shadow-lg">
                  <span className="text-[8px] font-black text-white">#7</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white">{friend.username}</p>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">FRIEND</span>
              </div>
            </div>
          </div>

          {/* H2H Record Banner */}
          <div className="flex items-center justify-center gap-6 py-3 px-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Your Wins</p>
              <p className="text-xl font-black text-emerald-400">{friend.h2hRecord?.wins}</p>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Draws</p>
              <p className="text-xl font-black text-white">{friend.h2hRecord?.draws}</p>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Wins</p>
              <p className="text-xl font-black text-blue-400">{friend.h2hRecord?.losses}</p>
            </div>
          </div>

          {/* AI Insight Box (Expanded) */}
          <div className="space-y-4">
            {/* Duo Synergy Level */}
            <div className="relative overflow-hidden bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/20 rounded-2xl p-5 group/synergy">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 border border-pink-500/30">
                    <Heart size={20} className="group-hover/synergy:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">DUO SYNERGY</p>
                    <p className="text-sm font-black text-white italic">LEVEL {friend.synergyLevel || 1}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">NEXT REWARD</p>
                  <p className="text-[10px] font-black text-emerald-400">SHARED PROFILE FRAME</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                  <span>Progress to Level {Number(friend.synergyLevel || 1) + 1}</span>
                  <span>1,200 / 2,000 SYNERGY XP</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/10 to-transparent border border-violet-500/20 rounded-2xl p-5">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-violet-500/20 rounded-xl text-violet-400 animate-pulse">
                  <Sparkles size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">AI Coach Insights</p>
                  <p className="text-xs text-white leading-relaxed font-medium">
                    {getAIMessage()}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <Heart size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Co-op Strategy</p>
                  <p className="text-xs text-white leading-relaxed font-medium">
                    {getCoopStrategy()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Skill Radar Chart */}
          <div className="flex flex-col items-center gap-4 py-4">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mastery Comparison</h3>
             <SkillRadarChart data={skillData} friendName={friend.username} />
          </div>

          {/* Core Stats Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compareStats.map(stat => (
              <div key={stat.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] transition-colors group">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2 group-hover:text-slate-400">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`text-base font-black ${Number(stat.user) >= Number(stat.friend) ? 'text-emerald-400' : 'text-white'}`}>
                      {stat.format ? stat.format(stat.user as number) : stat.user}
                    </p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className={`text-base font-black ${Number(stat.friend) >= Number(stat.user) ? 'text-blue-400' : 'text-white'}`}>
                      {stat.format ? stat.format(stat.friend as number) : stat.friend}
                    </p>
                  </div>
                </div>
                {!stat.isText && (
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden flex mt-2.5">
                    <div 
                      className="h-full bg-emerald-500/60" 
                      style={{ width: `${(Number(stat.user) / (Number(stat.user) + Number(stat.friend) || 1)) * 100}%` }} 
                    />
                    <div 
                      className="h-full bg-blue-500/60" 
                      style={{ width: `${(Number(stat.friend) / (Number(stat.user) + Number(stat.friend) || 1)) * 100}%` }} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Weekly Activity Summary */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={12} className="text-blue-400" /> Activity Overlap
            </h3>
            <div className="flex items-end justify-between gap-1 h-16">
              {friend.weeklyXPData?.map((xp, i) => {
                const max = Math.max(...(friend.weeklyXPData || [1]), 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-navy-800 px-1.5 py-0.5 rounded text-[8px] font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap border border-white/10">{xp} XP</div>
                    <motion.div 
                      className="w-full bg-blue-500/20 rounded-t-sm border-t border-blue-500/30 group-hover/bar:bg-blue-500/40 transition-colors"
                      initial={{ height: 0 }}
                      animate={{ height: `${(xp / max) * 100}%` }}
                    />
                    <span className="text-[8px] font-bold text-slate-700">{['M','T','W','T','F','S','S'][i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Actions & Send Challenge */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button 
                onClick={() => handleSocialAction('nudge')}
                disabled={socialActionSent === 'nudge'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xs hover:bg-orange-500/20 transition-all"
              >
                {socialActionSent === 'nudge' ? <span className="flex items-center gap-1.5 animate-bounce"><Flame size={14} /> Nudged!</span> : <><Flame size={14} /> Nudge</>}
              </button>
              <button 
                onClick={() => handleSocialAction('cheer')}
                disabled={socialActionSent === 'cheer'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all"
              >
                {socialActionSent === 'cheer' ? <span className="flex items-center gap-1.5 animate-bounce">🙌 Sent!</span> : <><TrendingUp size={14} /> Cheer</>}
              </button>
            </div>
            
            <button className="w-full py-4 rounded-2xl bg-violet-electric text-white font-black text-sm hover:bg-violet-600 transition-all shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 group">
              <Swords size={18} className="group-hover:rotate-12 transition-transform" /> START CHALLENGE
            </button>
            
            <button 
              onClick={onClose}
              className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest mt-2 transition-colors"
            >
              Close Comparison
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkillRadarChart({ data, friendName }: { data: { label: string; user: number; friend: number }[]; friendName: string }) {
  const size = 220;
  const center = size / 2;
  const radius = size * 0.4;
  const angleStep = (Math.PI * 2) / data.length;

  const getPoints = (isUser: boolean) => {
    return data.map((d, i) => {
      const value = isUser ? d.user : d.friend;
      const r = (value / 10) * radius;
      const angle = i * angleStep - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
  };

  return (
    <div className="relative group">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-2xl">
        {/* Background Grids */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale, idx) => (
          <polygon
            key={idx}
            points={data.map((_, i) => {
              const r = scale * radius;
              const angle = i * angleStep - Math.PI / 2;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(' ')}
            className="fill-none stroke-white/5"
            strokeWidth="0.5"
          />
        ))}

        {/* Axis Lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              className="stroke-white/5"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Polygons */}
        <motion.polygon
          points={getPoints(false)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.4, scale: 1 }}
          className="fill-blue-500 stroke-blue-500"
          strokeWidth="1.5"
          style={{ mixBlendMode: 'screen' }}
        />
        <motion.polygon
          points={getPoints(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.4, scale: 1 }}
          className="fill-emerald-500 stroke-emerald-500"
          strokeWidth="1.5"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = radius + 22;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          return (
            <text
              key={i}
              x={x}
              y={y}
              className="fill-slate-600 text-[8px] font-bold uppercase tracking-tighter"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-4 bg-navy-900/80 backdrop-blur-sm border border-white/5 px-3 py-1.5 rounded-full shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[8px] font-bold text-white uppercase tracking-wider">YOU</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[8px] font-bold text-white uppercase tracking-wider">{friendName.split('_')[0]}</span>
        </div>
      </div>
    </div>
  );
}

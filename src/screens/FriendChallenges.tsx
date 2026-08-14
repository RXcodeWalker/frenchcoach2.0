import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Swords, Search, UserPlus, Trophy,
  BarChart2, X, TrendingUp,
  Sparkles, Heart, MessageSquare, Star, Plus, Check, Ban
} from 'lucide-react';
import { MOCK_CHALLENGES, MOCK_ACTIVITY_FEED } from '../data/mocks/mockFriends';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Friend, ActivityFeedItem } from '../types';
import type { DuelChallenge } from '../types/duels';
import {
  listFriendships, sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  cancelFriendRequest, removeFriend, type FriendEntry,
} from '../services/social/friendsService';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { createDuelChallenge, respondDuelChallenge, listMyDuels } from '../services/duels/duelsService';
import { listPublishedQuestionSets } from '../data/exam/bank/loader';
import type { AuthoredQuestionSet } from '../data/exam/bank/types';

/** Adapts a real FriendEntry (username/avatar only) into the decorative
 *  Friend shape ComparisonModal/SkillRadarChart/VsSplash expect — those stay
 *  fully decorative/local-only per this phase's scope, so their stat fields
 *  are safe zero/placeholder defaults, never fabricated as if real. */
function toDecorativeFriend(entry: FriendEntry): Friend {
  return {
    id: entry.userId,
    username: entry.username,
    avatar: entry.avatar,
    total_xp: 0,
    level: 'Beginner',
    streak: 0,
    isOnline: false,
  };
}

export function FriendChallenges() {
  const { user } = useAuth();
  const authUserId = user?.id ?? null;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'duels' | 'co-op' | 'feed' | 'friends'>('duels');
  const [searchQuery, setSearchQuery] = useState('');
  const [comparingFriendId, setComparingFriendId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vsChallengeId, setVsChallengeId] = useState<string | null>(null);

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [duels, setDuels] = useState<DuelChallenge[]>([]);
  const [duelsLoading, setDuelsLoading] = useState(true);

  const loadFriends = useCallback(async () => {
    if (!authUserId) { setFriends([]); setFriendsLoading(false); return; }
    setFriendsLoading(true);
    const rows = await listFriendships(authUserId);
    setFriends(rows);
    setFriendsLoading(false);
  }, [authUserId]);

  const loadDuels = useCallback(async () => {
    if (!authUserId) { setDuels([]); setDuelsLoading(false); return; }
    setDuelsLoading(true);
    const rows = await listMyDuels(authUserId);
    setDuels(rows);
    setDuelsLoading(false);
  }, [authUserId]);

  useEffect(() => { void loadFriends(); }, [loadFriends]);
  useEffect(() => { void loadDuels(); }, [loadDuels]);

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCoops = MOCK_CHALLENGES.filter(c =>
    c.status === 'active' && (c.type.includes('co_op') || c.type === 'boss_raid')
  );

  const comparingFriend = friends.find(f => f.userId === comparingFriendId);
  const vsDuel = duels.find(d => d.duelId === vsChallengeId);

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

        {/* Daily Pair Quest Widget — decorative, unwired (co-op is out of scope this phase) */}
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
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Duels</h2>
              </div>

              {duelsLoading ? (
                <div className="py-12 text-center text-slate-600 text-sm">Loading duels…</div>
              ) : duels.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                  <Swords size={32} className="text-slate-800 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600 italic">No duels yet. Challenge a friend to a head-to-head!</p>
                </div>
              ) : (
                duels.map(duel => (
                  <DuelCard
                    key={duel.duelId}
                    duel={duel}
                    myUserId={authUserId}
                    onOpen={() => setVsChallengeId(duel.duelId)}
                    onRespond={async (action) => {
                      await respondDuelChallenge(duel.duelId, action);
                      await loadDuels();
                    }}
                    onViewDetail={() => navigate(`/duel/${duel.duelId}`)}
                  />
                ))
              )}

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
              </div>

              {activeCoops.length > 0 ? (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                  <Heart size={32} className="text-slate-800 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600 italic">Co-op challenges are coming soon.</p>
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                  <Heart size={32} className="text-slate-800 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600 italic">No active collaborations. Team up to reach goals faster!</p>
                </div>
              )}
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

              {friendsLoading ? (
                <div className="py-12 text-center text-slate-600 text-sm">Loading friends…</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredFriends.map(friend => (
                    <FriendRow
                      key={friend.userId}
                      friend={friend}
                      onCompare={friend.status === 'accepted' ? () => setComparingFriendId(friend.userId) : undefined}
                      onAccept={friend.status === 'pending' && !friend.requestedByMe ? async () => { await acceptFriendRequest(friend.userId); await loadFriends(); } : undefined}
                      onDecline={friend.status === 'pending' && !friend.requestedByMe ? async () => { await declineFriendRequest(friend.userId); await loadFriends(); } : undefined}
                      onCancel={friend.status === 'pending' && friend.requestedByMe ? async () => { await cancelFriendRequest(friend.userId); await loadFriends(); } : undefined}
                      onRemove={friend.status === 'accepted' ? async () => { await removeFriend(friend.userId); await loadFriends(); } : undefined}
                    />
                  ))}
                </div>
              )}

              <AddFriendBar onSent={() => void loadFriends()} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {comparingFriend && (
          <ComparisonModal
            friend={toDecorativeFriend(comparingFriend)}
            onClose={() => setComparingFriendId(null)}
          />
        )}
        {isCreateModalOpen && (
          <CreateDuelModal
            friends={acceptedFriends}
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={() => { setIsCreateModalOpen(false); void loadDuels(); }}
          />
        )}
        {vsDuel && (
          <VsSplash
            duel={vsDuel}
            myUserId={authUserId}
            onClose={() => setVsChallengeId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddFriendBar({ onSent }: { onSent: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; username: string; avatar_emoji: string | null }[]>([]);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('discoverable_profiles')
        .select('id, username, avatar_emoji')
        .ilike('username', `${query.trim()}%`)
        .limit(10);
      if (!cancelled && !error) setResults(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [query]);

  async function handleSend(targetId: string) {
    const result = await sendFriendRequest(targetId);
    if (result.ok) {
      setSentTo(targetId);
      onSent();
    }
  }

  return (
    <div className="pt-4 flex flex-col items-center gap-4">
      <p className="text-xs text-slate-600 italic">Add a friend by username</p>
      <div className="w-full max-w-sm space-y-2">
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSentTo(null); }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/30 transition-all"
        />
        {results.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
            <span className="text-sm text-white">{r.avatar_emoji ?? '🙂'} {r.username}</span>
            <button
              onClick={() => void handleSend(r.id)}
              disabled={sentTo === r.id}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {sentTo === r.id ? 'Sent' : 'Add'}
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
          <UserPlus size={16} /> Invite Friends
        </button>
      </div>
    </div>
  );
}

function VsSplash({ duel, myUserId }: { duel: DuelChallenge; myUserId: string | null; onClose: () => void }) {
  const iAmChallenger = duel.challengerId === myUserId;
  const myName = iAmChallenger ? duel.challengerUsername : duel.opponentUsername;
  const opponentName = iAmChallenger ? duel.opponentUsername : duel.challengerUsername;

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
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{myName}</h2>
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
            {opponentName[0]}
          </div>
          <div className="text-center">
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{opponentName}</h2>
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
    </motion.div>
  );
}

function DuelCard({ duel, myUserId, onOpen, onRespond, onViewDetail }: {
  duel: DuelChallenge;
  myUserId: string | null;
  onOpen: () => void;
  onRespond: (action: 'accept' | 'decline') => Promise<void>;
  onViewDetail: () => void;
}) {
  const iAmChallenger = duel.challengerId === myUserId;
  const iAmOpponent = duel.opponentId === myUserId;
  const opponentName = iAmChallenger ? duel.opponentUsername : duel.challengerUsername;
  const opponentAvatar = (iAmChallenger ? duel.opponentAvatarEmoji : duel.challengerAvatarEmoji) ?? '🙂';
  const myResult = iAmChallenger ? duel.myAttempt : duel.opponentAttempt;
  const iWon = duel.winnerUserId === myUserId;
  const [busy, setBusy] = useState(false);

  const statusLabel: Record<DuelChallenge['status'], string> = {
    pending: iAmOpponent ? 'Invite received' : 'Invite sent',
    accepted: myResult ? 'Waiting on opponent' : 'Ready to play',
    declined: 'Declined',
    cancelled: 'Cancelled',
    completed: duel.isTie ? 'Tie' : iWon ? 'You won' : 'You lost',
    expired: 'Expired',
  };

  return (
    <motion.div
      className="glass-elevated p-6 rounded-2xl border-white/5 relative overflow-hidden group"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex flex-col md:flex-row gap-4 items-center relative z-10">
        <div className="flex items-center gap-3 flex-1 w-full">
          <span className="text-2xl">{opponentAvatar}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">vs {opponentName}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">{statusLabel[duel.status]}</p>
          </div>
          {duel.status === 'completed' && (
            <Trophy size={18} className={duel.isTie ? 'text-slate-400' : iWon ? 'text-emerald-400' : 'text-slate-600'} />
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {duel.status === 'pending' && iAmOpponent && (
            <>
              <button
                onClick={() => { setBusy(true); void onRespond('decline').finally(() => setBusy(false)); }}
                disabled={busy}
                className="flex-1 py-2 px-4 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 hover:text-white transition-all disabled:opacity-50"
              >
                DECLINE
              </button>
              <button
                onClick={() => { setBusy(true); void onRespond('accept').finally(() => setBusy(false)); }}
                disabled={busy}
                className="flex-1 py-2 px-4 bg-white text-slate-950 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                ACCEPT
              </button>
            </>
          )}
          {duel.status === 'accepted' && (
            <button
              onClick={() => { onOpen(); onViewDetail(); }}
              className="w-full px-6 py-2 font-black rounded-xl transition-all text-xs italic tracking-tighter bg-white text-slate-950 hover:bg-slate-200"
            >
              PLAY
            </button>
          )}
          {(duel.status === 'completed' || duel.status === 'expired' || duel.status === 'pending' && !iAmOpponent) && (
            <button
              onClick={onViewDetail}
              className="w-full px-6 py-2 font-black rounded-xl transition-all text-xs italic tracking-tighter bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
            >
              VIEW
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CreateDuelModal({ friends, onClose, onCreated }: {
  friends: FriendEntry[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [questionSets, setQuestionSets] = useState<AuthoredQuestionSet[]>([]);
  const [questionSetsLoading, setQuestionSetsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  async function goToQuestionSetStep(id: string) {
    setOpponentId(id);
    setStep(2);
    setQuestionSetsLoading(true);
    const sets = await listPublishedQuestionSets();
    setQuestionSets(sets);
    setQuestionSetsLoading(false);
  }

  async function handleSend(questionSetId: string) {
    if (!opponentId) return;
    setCreating(true);
    setErrorReason(null);
    const result = await createDuelChallenge(opponentId, questionSetId);
    setCreating(false);
    if (result.ok) {
      onCreated();
    } else {
      setErrorReason(result.reason);
    }
  }

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
          <h2 className="text-xl font-black text-white italic tracking-tighter">NEW DUEL</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">SELECT OPPONENT</p>
              {friends.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8 italic">Add a friend first to challenge them to a duel.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {friends.map(f => (
                    <button
                      key={f.userId}
                      onClick={() => void goToQuestionSetStep(f.userId)}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all flex items-center gap-3"
                    >
                      <span className="text-lg">{f.avatar ?? '🙂'}</span>
                      <span className="text-sm font-bold text-white">{f.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
               <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SELECT QUESTION SET</p>
                {questionSetsLoading ? (
                  <p className="text-xs text-slate-600 text-center py-8">Loading question sets…</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {questionSets.map(set => (
                      <button
                        key={set.questionSetId}
                        onClick={() => void handleSend(set.questionSetId)}
                        disabled={creating}
                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all flex items-center justify-between group disabled:opacity-50"
                      >
                        <span className="text-sm font-bold text-white">{set.content.rolePlay.title}</span>
                      </button>
                    ))}
                  </div>
                )}
               </div>

               {errorReason && (
                 <p className="text-xs text-red-400 text-center">Couldn't send duel: {errorReason}</p>
               )}

               <button onClick={() => setStep(1)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">Back</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ActivityFeedCard({ item }: { item: ActivityFeedItem }) {
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
        <span className="text-sm font-black text-white">{item.content[0]}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
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

function FriendRow({ friend, onCompare, onAccept, onDecline, onCancel, onRemove }: {
  friend: FriendEntry;
  onCompare?: () => void;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    await fn();
    setBusy(false);
  }

  return (
    <div className="glass-elevated p-4 rounded-2xl border-white/5 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/10 overflow-hidden text-lg">
            {friend.avatar ?? friend.username[0]}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">{friend.username}</h3>
          {friend.status === 'pending' && (
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              {friend.requestedByMe ? 'Request sent' : 'Wants to be friends'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onAccept && (
          <button onClick={() => void run(onAccept)} disabled={busy} className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50" title="Accept">
            <Check size={16} />
          </button>
        )}
        {onDecline && (
          <button onClick={() => void run(onDecline)} disabled={busy} className="p-2.5 bg-white/5 text-slate-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50" title="Decline">
            <Ban size={16} />
          </button>
        )}
        {onCancel && (
          <button onClick={() => void run(onCancel)} disabled={busy} className="p-2.5 bg-white/5 text-slate-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50" title="Cancel request">
            <X size={16} />
          </button>
        )}
        {onCompare && (
          <button
            onClick={onCompare}
            className="p-2.5 bg-white/5 text-slate-500 rounded-xl hover:bg-violet-500/10 hover:text-violet-400 transition-all border border-transparent hover:border-violet-500/20"
            title="Compare Progress"
          >
            <BarChart2 size={16} />
          </button>
        )}
        {onRemove && (
          <button onClick={() => void run(onRemove)} disabled={busy} className="p-2.5 bg-white/5 text-slate-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50" title="Remove friend">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
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
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white">{friend.username}</p>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">FRIEND</span>
              </div>
            </div>
          </div>

          {/* AI Insight Box */}
          <div className="space-y-4">
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

          {/* Social Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => handleSocialAction('nudge')}
                disabled={socialActionSent === 'nudge'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xs hover:bg-orange-500/20 transition-all"
              >
                {socialActionSent === 'nudge' ? <span className="flex items-center gap-1.5 animate-bounce">🔥 Nudged!</span> : <>🔥 Nudge</>}
              </button>
              <button
                onClick={() => handleSocialAction('cheer')}
                disabled={socialActionSent === 'cheer'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all"
              >
                {socialActionSent === 'cheer' ? <span className="flex items-center gap-1.5 animate-bounce">🙌 Sent!</span> : <><TrendingUp size={14} /> Cheer</>}
              </button>
            </div>

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

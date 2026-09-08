import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Users, Globe, Clock, Flame, Check, X as XIcon, UserMinus, Inbox, Search, UserPlus, Zap } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { UsernameSetupModal } from '../components/ui/UsernameSetupModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getWeeklyLeaderboard, getAllTimeLeaderboard, getMyWeeklyRank, getMyAllTimeRank, type Timeframe } from '../services/social/leaderboardService';
import {
  listFriendships, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriend, sendFriendRequest,
  type FriendEntry,
} from '../services/social/friendsService';
import { searchUsernames, type SearchResult } from '../services/social/searchService';
import { getWeekKey } from '../domain/weekKey';
import { RankingUser } from '../types';
import { CosmeticPreview } from '../components/ui/CosmeticPreview';
import { useCatalogue } from '../services/shop/useCatalogue';
import { rarityOf, RARITY_COLOR } from '../services/shop/rarity';
import type { ShopItem } from '../types/shop';

type Tab = 'global' | 'friends' | 'requests';

function makeNameplateColorLookup(catalogue: ShopItem[]) {
  return (itemId: string | null | undefined): React.CSSProperties | undefined => {
    if (!itemId) return undefined;
    const item = catalogue.find(i => i.id === itemId);
    return item ? { color: RARITY_COLOR[rarityOf(item)] } : undefined;
  };
}

function nextWeekRolloverLabel(): string {
  // Next UTC Monday 00:00 — the boundary the shared week-key util rolls over on.
  const now = new Date();
  const day = now.getUTCDay(); // Sunday=0..Saturday=6
  const daysUntilMonday = day === 1 ? 7 : ((8 - day) % 7) || 7;
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  const ms = nextMonday.getTime() - now.getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${days}d ${hours}h ${minutes}m`;
}

export function Rankings() {
  const { state } = useApp();
  const { profile } = state;
  // profile.id is the local placeholder 'local-user' (AppContext), not a uuid —
  // every social table keys on the Supabase auth uuid, so passing profile.id
  // makes PostgREST reject the filter outright ("invalid input syntax for type
  // uuid"). Signed-out users get no social data at all rather than a bad query.
  const { user } = useAuth();
  const authUserId = user?.id ?? null;
  const catalogue = useCatalogue();
  const nameplateColorOf = useMemo(() => makeNameplateColorLookup(catalogue), [catalogue]);
  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [friendships, setFriendships] = useState<FriendEntry[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekKey = useMemo(() => getWeekKey(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = timeframe === 'weekly'
      ? await getWeeklyLeaderboard(authUserId)
      : await getAllTimeLeaderboard(authUserId);
    setUsers(rows);

    const mine = rows.find(u => u.isCurrentUser);
    if (mine) {
      setMyRank(mine.rank ?? null);
    } else {
      const rank = timeframe === 'weekly'
        ? await getMyWeeklyRank(0)
        : await getMyAllTimeRank(profile.total_xp);
      setMyRank(rank);
    }
    setLoading(false);
  }, [timeframe, authUserId, profile.total_xp]);

  const loadFriendships = useCallback(async () => {
    if (!authUserId) {
      setFriendships([]);
      setFriendsLoading(false);
      return;
    }
    setFriendsLoading(true);
    const rows = await listFriendships(authUserId);
    setFriendships(rows);
    setFriendsLoading(false);
  }, [authUserId]);

  useEffect(() => {
    if (activeTab === 'global') void load();
  }, [activeTab, load]);

  useEffect(() => {
    if (activeTab === 'friends' || activeTab === 'requests') void loadFriendships();
  }, [activeTab, loadFriendships]);

  useEffect(() => {
    // claim_username is GRANT EXECUTE ... TO authenticated, so prompting a
    // signed-out user can only ever end in a failed claim.
    if (authUserId && !profile.username) setShowUsernameModal(true);
  }, [authUserId, profile.username]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(() => {
      void searchUsernames(searchQuery.trim()).then(setSearchResults);
    }, 300);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery]);

  async function handleSendRequest(userId: string) {
    const result = await sendFriendRequest(userId);
    if (result.ok) setSentTo(prev => new Set(prev).add(userId));
  }

  const accepted = friendships.filter(f => f.status === 'accepted');
  const incoming = friendships.filter(f => f.status === 'pending' && !f.requestedByMe);
  const outgoing = friendships.filter(f => f.status === 'pending' && f.requestedByMe);

  async function handleAccept(userId: string) {
    const result = await acceptFriendRequest(userId);
    if (result.ok) void loadFriendships();
  }
  async function handleDecline(userId: string) {
    const result = await declineFriendRequest(userId);
    if (result.ok) void loadFriendships();
  }
  async function handleCancel(userId: string) {
    const result = await cancelFriendRequest(userId);
    if (result.ok) void loadFriendships();
  }
  async function handleRemove(userId: string) {
    const result = await removeFriend(userId);
    if (result.ok) void loadFriendships();
  }

  return (
    <PageShell>
      {showUsernameModal && (
        <UsernameSetupModal onClose={() => setShowUsernameModal(false)} />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={14} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Hall of Fame</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Rankings</h1>
        <p className="text-sm text-ink-muted mt-1">Compete with learners worldwide</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-navy-300/50 rounded-xl mb-6">
        {(['global', 'friends', 'requests'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-violet-electric text-white shadow-lg'
                : 'text-ink-muted hover:text-ink-muted'
            }`}
          >
            {tab === 'global' && <Globe size={14} />}
            {tab === 'friends' && <Users size={14} />}
            {tab === 'requests' && <Inbox size={14} />}
            <span className="capitalize">{tab}</span>
            {tab === 'requests' && incoming.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{incoming.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'global' && (
          <>
            {/* Daily Challenge comparison — links out to the shared once-a-day set */}
            <Link to="/daily-challenge">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 p-4 rounded-2xl border border-violet-electric/20 bg-violet-electric/5 hover:bg-violet-electric/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-electric/15 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">Daily Challenge</p>
                  <p className="text-[10px] text-ink-muted">Same question, everyone, once a day — see today's leaderboard</p>
                </div>
              </motion.div>
            </Link>

            {/* League Power promo — weekly XP cohorts */}
            <Link to="/league">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 p-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                  <Trophy size={16} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">League Power</p>
                  <p className="text-[10px] text-ink-muted">Weekly cohorts — climb the ranks, don't get demoted</p>
                </div>
              </motion.div>
            </Link>

            {/* Week rollover card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl p-6 border border-white/5"
              style={{ background: 'linear-gradient(135deg, #7C3AED15 0%, transparent 100%)' }}
            >
              <div className="relative z-10 grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-ink-muted uppercase font-bold mb-1">Week resets in</p>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-violet-400" />
                    <p className="text-sm font-bold text-white">{nextWeekRolloverLabel()}</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-ink-muted uppercase font-bold mb-1">Your Rank</p>
                  <div className="flex items-center gap-2">
                    <Trophy size={12} className="text-amber-400" />
                    <p className="text-sm font-bold text-white">{myRank ? `#${myRank}` : 'Unranked'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Timeframe toggle */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white capitalize">Global Leaderboard</h3>
              <div className="flex p-1 bg-navy-300/30 rounded-lg">
                {(['weekly', 'all-time'] as Timeframe[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                      timeframe === t
                        ? 'bg-white/10 text-white'
                        : 'text-ink-subtle hover:text-ink-muted'
                    }`}
                  >
                    {t === 'weekly' ? 'Weekly' : 'All-Time'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pb-24">
              {loading ? (
                <div className="text-center py-12 text-ink-subtle text-sm">Loading…</div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-ink-subtle text-sm">
                  No one has ranked in {timeframe === 'weekly' ? `week ${weekKey}` : 'the all-time board'} yet.
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {users.map((user, index) => (
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
                      <div className="w-6 text-center">
                        {user.rank === 1 ? (
                          <span className="text-xl">🥇</span>
                        ) : user.rank === 2 ? (
                          <span className="text-xl">🥈</span>
                        ) : user.rank === 3 ? (
                          <span className="text-xl">🥉</span>
                        ) : (
                          <span className="text-sm font-black text-ink-subtle group-hover:text-ink-muted">
                            {user.rank}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <CosmeticPreview
                          avatarEmoji={user.avatar ?? null}
                          frameItemId={user.equippedFrame ?? null}
                          nameplateItemId={null}
                          catalogue={catalogue}
                          size={40}
                        />
                        {user.streak > 50 && (
                          <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5 border border-navy shadow-lg">
                            <Flame size={8} className="text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p
                          className={`text-sm font-bold ${user.isCurrentUser ? 'text-white' : 'text-slate-200'}`}
                          style={nameplateColorOf(user.equippedNameplate)}
                        >
                          {user.username} {user.isCurrentUser && <span className="text-[10px] text-violet-400">(You)</span>}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-white">
                          {(timeframe === 'weekly' ? user.weeklyXP : user.totalXP).toLocaleString()}
                          <span className="text-[10px] font-bold text-ink-subtle ml-1">XP</span>
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-4 pb-24">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username…"
                className="w-full bg-navy-300/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-ink-subtle focus:outline-none focus:border-violet-electric/50 transition-colors"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider px-1">Results</h3>
                {searchResults.map(r => (
                  <div key={r.userId} className="flex items-center gap-4 p-3 rounded-xl glass">
                    <CosmeticPreview
                      avatarEmoji={r.avatar ?? null}
                      frameItemId={r.equippedFrame ?? null}
                      nameplateItemId={null}
                      catalogue={catalogue}
                      size={36}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-200" style={nameplateColorOf(r.equippedNameplate)}>{r.username}</p>
                    </div>
                    <button
                      onClick={() => handleSendRequest(r.userId)}
                      disabled={sentTo.has(r.userId)}
                      className="p-2 rounded-lg text-violet-400 hover:bg-violet-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title={sentTo.has(r.userId) ? 'Request sent' : 'Send friend request'}
                    >
                      {sentTo.has(r.userId) ? <Check size={16} /> : <UserPlus size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {friendsLoading ? (
              <div className="text-center py-12 text-ink-subtle text-sm">Loading…</div>
            ) : accepted.length === 0 ? (
              <div className="text-center py-12 text-ink-subtle text-sm">
                No friends yet. Accept a request from the Requests tab to get started.
              </div>
            ) : (
              accepted.map(f => (
                <div key={f.userId} className="flex items-center gap-4 p-4 rounded-xl glass">
                  <CosmeticPreview
                    avatarEmoji={f.avatar ?? null}
                    frameItemId={f.equippedFrame ?? null}
                    nameplateItemId={null}
                    catalogue={catalogue}
                    size={40}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-200" style={nameplateColorOf(f.equippedNameplate)}>{f.username}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(f.userId)}
                    className="p-2 rounded-lg text-ink-subtle hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove friend"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6 pb-24">
            <div>
              <h3 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 px-1">Incoming</h3>
              <div className="space-y-2">
                {friendsLoading ? (
                  <div className="text-center py-8 text-ink-subtle text-sm">Loading…</div>
                ) : incoming.length === 0 ? (
                  <div className="text-center py-8 text-ink-subtle text-sm">No incoming requests.</div>
                ) : (
                  incoming.map(f => (
                    <div key={f.userId} className="flex items-center gap-4 p-4 rounded-xl glass">
                      <CosmeticPreview
                        avatarEmoji={f.avatar ?? null}
                        frameItemId={f.equippedFrame ?? null}
                        nameplateItemId={null}
                        catalogue={catalogue}
                        size={40}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-200" style={nameplateColorOf(f.equippedNameplate)}>{f.username}</p>
                      </div>
                      <button
                        onClick={() => handleAccept(f.userId)}
                        className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Accept"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleDecline(f.userId)}
                        className="p-2 rounded-lg text-ink-subtle hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Decline"
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 px-1">Sent</h3>
              <div className="space-y-2">
                {friendsLoading ? null : outgoing.length === 0 ? (
                  <div className="text-center py-8 text-ink-subtle text-sm">No sent requests.</div>
                ) : (
                  outgoing.map(f => (
                    <div key={f.userId} className="flex items-center gap-4 p-4 rounded-xl glass">
                      <CosmeticPreview
                        avatarEmoji={f.avatar ?? null}
                        frameItemId={f.equippedFrame ?? null}
                        nameplateItemId={null}
                        catalogue={catalogue}
                        size={40}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-200" style={nameplateColorOf(f.equippedNameplate)}>{f.username}</p>
                        <p className="text-[9px] text-ink-subtle">Pending</p>
                      </div>
                      <button
                        onClick={() => handleCancel(f.userId)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default Rankings;

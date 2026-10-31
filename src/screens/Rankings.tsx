import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, Flame, Search, Trophy } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { UsernameSetupModal } from '../components/ui/UsernameSetupModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getWeeklyLeaderboard, getAllTimeLeaderboard, getMyWeeklyRank, getMyAllTimeRank, getMyAllTimeXp, type Timeframe } from '../services/social/leaderboardService';
import {
  listFriendships, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriend, sendFriendRequest,
  type FriendEntry,
} from '../services/social/friendsService';
import { searchUsernames, type SearchResult } from '../services/social/searchService';
import { getWeekKey } from '../domain/weekKey';
import { RankingUser } from '../types';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { PersonRow } from '../features/rankings/PersonRow';
import { weekResetsIn } from '../features/rankings/weekReset';
import { enter, enterReduced } from '../components/motion/variants';
import { useNavigate } from 'react-router-dom';
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

export function Rankings() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
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
    } else if (timeframe === 'weekly') {
      setMyRank(await getMyWeeklyRank(0));
    } else {
      // Rank against the same basis the board is ranked by
      // (xp_baseline + SUM(xp_events)), not local progression XP (Phase 1.3).
      const myXp = authUserId ? await getMyAllTimeXp(authUserId) : null;
      setMyRank(await getMyAllTimeRank(myXp ?? profile.total_xp));
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
    setConfirmRemove(null);
    if (result.ok) void loadFriendships();
  }

  const card = 'rounded-card border border-hairline bg-surface';
  const incomingCount = incoming.length;

  const emptyNote = (text: string) => <p className="px-4 py-10 text-center text-body-s text-ink-muted">{text}</p>;
  const signInNote = (
    <p className="px-4 py-10 text-center text-body-s text-ink-muted">
      Sign in to add friends and see requests.{' '}
      <Link to="/login" className="font-semibold text-action-text underline-offset-2 hover:underline">Sign in</Link>
    </p>
  );

  const rankBadge = (rank: number | undefined) => (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill font-numeral text-label
        ${rank === 1 ? 'bg-reward-soft text-reward-text' : 'bg-track text-ink-muted'}`}
      aria-label={`Rank ${rank ?? 'unranked'}`}
    >
      {rank ?? '–'}
    </span>
  );

  return (
    <>
      <TopContextBar title="Rankings" subtitle="See where you stand" showBack backLabel="Back to Explore" onBack={() => navigate('/explore')} />
      <PageShell maxWidth="md" gap={16}>
        {showUsernameModal && <UsernameSetupModal onClose={() => setShowUsernameModal(false)} />}

        <motion.div variants={item}>
          <Segmented<Tab>
            label="Rankings view"
            value={activeTab}
            onChange={setActiveTab}
            testIdPrefix="rank-tab"
            options={[
              { id: 'global', label: 'Leaderboard' },
              { id: 'friends', label: 'Friends' },
              {
                id: 'requests',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    Requests
                    {incomingCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-correction px-1 font-numeral text-caption text-action-ink">
                        {incomingCount}
                        <span className="sr-only"> new</span>
                      </span>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </motion.div>

        {activeTab === 'global' && (
          <>
            <motion.section variants={item} className={`${card} p-5 md:p-6`} aria-label="Your standing">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-control bg-surface-recessed p-4">
                  <p className="text-eyebrow uppercase text-ink-subtle">Your rank</p>
                  <p className="mt-1 flex items-center gap-2 font-numeral text-title text-ink" data-testid="rank-mine">
                    <Trophy size={18} strokeWidth={1.75} aria-hidden="true" className="text-reward-text" />
                    {myRank ? `#${myRank}` : 'Unranked'}
                  </p>
                </div>
                <div className="rounded-control bg-surface-recessed p-4">
                  <p className="text-eyebrow uppercase text-ink-subtle">Week resets in</p>
                  <p className="mt-1 flex items-center gap-2 font-numeral text-title text-ink">
                    <CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" className="text-ink-muted" />
                    {weekResetsIn()}
                  </p>
                </div>
              </div>
              {!myRank && !loading && (
                <p className="mt-3 text-body-s text-ink-muted">Earn XP this week to appear on the board.</p>
              )}
            </motion.section>

            <motion.section variants={item} className="grid gap-3 sm:grid-cols-2" aria-label="More ways to compete">
              {[
                { to: '/daily-challenge', Icon: Flame, title: 'Daily Challenge', text: 'Same question for everyone, once a day.' },
                { to: '/league', Icon: Trophy, title: 'League Power', text: 'Weekly cohorts. Climb, don’t get demoted.' },
              ].map(({ to, Icon, title, text }) => (
                <Link
                  key={to}
                  to={to}
                  className={`${card} flex items-center gap-3 p-4 transition-colors duration-state ease-smooth hover:border-hairline-strong hover:bg-track`}
                >
                  <span aria-hidden="true" className="topic-chip flex h-10 w-10 shrink-0 items-center justify-center" style={{ '--h': 67, borderRadius: 8 } as CSSProperties}>
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-ink">{title}</span>
                    <span className="block text-caption text-ink-subtle">{text}</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-ink-subtle" />
                </Link>
              ))}
            </motion.section>

            <motion.section variants={item} className={card} aria-labelledby="rank-board">
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                <h2 id="rank-board" className="text-section text-ink">Global leaderboard</h2>
                <div role="group" aria-label="Time range" className="flex gap-1">
                  {(['weekly', 'all-time'] as Timeframe[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={timeframe === t}
                      onClick={() => setTimeframe(t)}
                      className={`h-9 rounded-control px-3 text-label transition-colors duration-state ease-smooth
                        ${timeframe === t ? 'bg-action-soft text-action-text' : 'text-ink-muted hover:bg-track hover:text-ink'}`}
                    >
                      {t === 'weekly' ? 'This week' : 'All time'}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <ul className="divide-y divide-hairline" aria-busy="true" data-testid="rank-loading">
                  {[0, 1, 2, 3, 4].map(i => (
                    <li key={i} className="flex min-h-16 items-center gap-3 px-4 py-3" aria-hidden="true">
                      <span className="h-8 w-8 rounded-pill bg-track" />
                      <span className="h-10 w-10 rounded-pill bg-track" />
                      <span className="h-4 w-32 rounded-control bg-track" />
                    </li>
                  ))}
                </ul>
              ) : users.length === 0 ? (
                emptyNote(`No one has ranked in ${timeframe === 'weekly' ? `week ${weekKey}` : 'the all-time board'} yet.`)
              ) : (
                <ul className="divide-y divide-hairline">
                  {users.map(u => (
                    <PersonRow
                      key={u.id}
                      username={u.username}
                      avatar={u.avatar}
                      frame={u.equippedFrame}
                      catalogue={catalogue}
                      nameStyle={nameplateColorOf(u.equippedNameplate)}
                      isYou={u.isCurrentUser}
                      lead={rankBadge(u.rank)}
                      note={u.streak >= 7 ? (
                        <span className="inline-flex items-center gap-1 text-streak-text">
                          <Flame size={12} aria-hidden="true" /> <span className="font-numeral">{u.streak}</span> day streak
                        </span>
                      ) : undefined}
                      trail={
                        <p className="shrink-0 text-right text-label text-ink">
                          <span className="font-numeral">{(timeframe === 'weekly' ? u.weeklyXP : u.totalXP).toLocaleString()}</span>
                          <span className="ml-1 text-caption font-normal text-ink-subtle">XP</span>
                        </p>
                      }
                    />
                  ))}
                </ul>
              )}
            </motion.section>
          </>
        )}

        {activeTab === 'friends' && (
          <>
            <motion.section variants={item} className={`${card} p-4`} aria-label="Find friends">
              <label htmlFor="rank-search" className="text-eyebrow uppercase text-ink-subtle">Find a friend</label>
              <div className="relative mt-2">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  id="rank-search"
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by username"
                  autoComplete="off"
                  disabled={!authUserId}
                  className="h-11 w-full rounded-control border border-hairline-strong bg-surface pl-9 pr-3 text-body-s text-ink
                    placeholder:text-ink-subtle disabled:text-ink-subtle"
                />
              </div>
              {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="mt-3 text-body-s text-ink-muted">No one found for “{searchQuery.trim()}”.</p>
              )}
              {searchResults.length > 0 && (
                <ul className="mt-3 divide-y divide-hairline overflow-hidden rounded-control border border-hairline">
                  {searchResults.map(r => (
                    <PersonRow
                      key={r.userId}
                      username={r.username}
                      avatar={r.avatar}
                      frame={r.equippedFrame}
                      catalogue={catalogue}
                      nameStyle={nameplateColorOf(r.equippedNameplate)}
                      trail={
                        sentTo.has(r.userId) ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-label text-progress-text"><Check size={14} aria-hidden="true" /> Sent</span>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => handleSendRequest(r.userId)} className="shrink-0">Add</Button>
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </motion.section>

            <motion.section variants={item} className={card} aria-labelledby="rank-friends">
              <h2 id="rank-friends" className="border-b border-hairline px-4 py-3 text-section text-ink">
                Your friends{accepted.length > 0 && <span className="ml-2 font-numeral text-ink-subtle">{accepted.length}</span>}
              </h2>
              {!authUserId ? signInNote : friendsLoading ? (
                <p className="px-4 py-10 text-center text-body-s text-ink-muted">Loading friends…</p>
              ) : accepted.length === 0 ? (
                emptyNote('No friends yet. Search for a username above, or accept a request.')
              ) : (
                <ul className="divide-y divide-hairline">
                  {accepted.map(f => (
                    <PersonRow
                      key={f.userId}
                      username={f.username}
                      avatar={f.avatar}
                      frame={f.equippedFrame}
                      catalogue={catalogue}
                      nameStyle={nameplateColorOf(f.equippedNameplate)}
                      trail={
                        confirmRemove === f.userId ? (
                          <span className="flex shrink-0 items-center gap-1">
                            <Button variant="destructive" size="sm" onClick={() => handleRemove(f.userId)}>Remove</Button>
                            <Button variant="quiet" size="sm" onClick={() => setConfirmRemove(null)}>Keep</Button>
                          </span>
                        ) : (
                          <Button variant="quiet" size="sm" onClick={() => setConfirmRemove(f.userId)} className="shrink-0" aria-label={`Remove ${f.username} from friends`}>
                            Remove
                          </Button>
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </motion.section>
          </>
        )}

        {activeTab === 'requests' && (
          <>
            <motion.section variants={item} className={card} aria-labelledby="rank-incoming">
              <h2 id="rank-incoming" className="border-b border-hairline px-4 py-3 text-section text-ink">Incoming</h2>
              {!authUserId ? signInNote : friendsLoading ? (
                <p className="px-4 py-10 text-center text-body-s text-ink-muted">Loading requests…</p>
              ) : incoming.length === 0 ? (
                emptyNote('No incoming requests.')
              ) : (
                <ul className="divide-y divide-hairline">
                  {incoming.map(f => (
                    <PersonRow
                      key={f.userId}
                      username={f.username}
                      avatar={f.avatar}
                      frame={f.equippedFrame}
                      catalogue={catalogue}
                      nameStyle={nameplateColorOf(f.equippedNameplate)}
                      trail={
                        <span className="flex shrink-0 items-center gap-1">
                          <Button size="sm" onClick={() => handleAccept(f.userId)}>Accept</Button>
                          <Button variant="quiet" size="sm" onClick={() => handleDecline(f.userId)}>Decline</Button>
                        </span>
                      }
                    />
                  ))}
                </ul>
              )}
            </motion.section>

            {authUserId && !friendsLoading && (
              <motion.section variants={item} className={card} aria-labelledby="rank-sent">
                <h2 id="rank-sent" className="border-b border-hairline px-4 py-3 text-section text-ink">Sent</h2>
                {outgoing.length === 0 ? (
                  emptyNote('No sent requests.')
                ) : (
                  <ul className="divide-y divide-hairline">
                    {outgoing.map(f => (
                      <PersonRow
                        key={f.userId}
                        username={f.username}
                        avatar={f.avatar}
                        frame={f.equippedFrame}
                        catalogue={catalogue}
                        nameStyle={nameplateColorOf(f.equippedNameplate)}
                        note="Waiting for a reply"
                        trail={<Button variant="quiet" size="sm" onClick={() => handleCancel(f.userId)} className="shrink-0">Cancel</Button>}
                      />
                    ))}
                  </ul>
                )}
              </motion.section>
            )}
          </>
        )}
      </PageShell>
    </>
  );
}

export default Rankings;

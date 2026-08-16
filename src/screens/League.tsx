import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { useAuth } from '../context/AuthContext';
import { getMyLeagueStanding, getLastWeekOutcome } from '../services/league/leagueService';
import type { MyLeagueStanding, LastWeekOutcome } from '../types/league';

type ViewState = 'loading' | 'error' | 'unranked' | 'active';

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

const TIER_COLOR: Record<string, string> = {
  bronze: '#B87333',
  silver: '#9CA3AF',
  gold: '#F59E0B',
  platinum: '#22D3EE',
  diamond: '#A78BFA',
};

export function League() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [view, setView] = useState<ViewState>('loading');
  const [standing, setStanding] = useState<MyLeagueStanding | null>(null);
  const [lastWeek, setLastWeek] = useState<LastWeekOutcome | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const load = useCallback(async () => {
    setView('loading');
    const [standingResult, lastWeekResult] = await Promise.all([
      getMyLeagueStanding(userId),
      getLastWeekOutcome(userId),
    ]);

    if (standingResult === null) {
      setStanding(null);
      setLastWeek(lastWeekResult);
      setView('unranked');
      return;
    }

    setStanding(standingResult);
    setLastWeek(lastWeekResult);
    setView('active');
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (view === 'loading') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 text-slate-500 text-sm">Loading…</div>
      </PageShell>
    );
  }

  if (view === 'error') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 space-y-2">
          <p className="text-sm font-bold text-white">Couldn't load your league</p>
          <button onClick={() => void load()} className="text-xs text-violet-400 font-bold underline underline-offset-2">
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  if (view === 'unranked') {
    return (
      <PageShell maxWidth="sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={14} className="text-violet-400" />
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">League Power</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Leagues</h1>
        </div>
        <div className="text-center py-16 space-y-2">
          <Trophy size={24} className="mx-auto text-slate-600" />
          <p className="text-sm font-bold text-white">Not ranked yet</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Earn XP this week and you'll be placed into a league cohort at the next weekly assignment.
          </p>
        </div>
      </PageShell>
    );
  }

  if (!standing) return null;

  // Client-side promotion/demotion zone sizing MUST match the backend's own
  // rule exactly (GREATEST(1, ROUND(size * 0.15)), top/bottom 15%) --
  // 20260815090300_league_assignment_rpc.sql, Phase A UPDATE. This is
  // display-only (the server already computed promoted/demoted per member),
  // used just to draw the zone divider lines in the roster below.
  const size = standing.members.length;
  const zoneSize = Math.max(1, Math.round(size * 0.15));
  const showLastWeekBanner =
    !bannerDismissed &&
    lastWeek &&
    lastWeek.weekKey !== standing.weekKey &&
    (lastWeek.promoted || lastWeek.demoted);

  return (
    <PageShell maxWidth="sm">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={14} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">League Power</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Leagues</h1>
      </div>

      <div
        className="rounded-2xl p-5 glass-elevated flex items-center gap-4"
        style={{ borderColor: `${TIER_COLOR[standing.poolTier]}40` }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `${TIER_COLOR[standing.poolTier]}15`, border: `1px solid ${TIER_COLOR[standing.poolTier]}30` }}
        >
          <Trophy size={22} style={{ color: TIER_COLOR[standing.poolTier] }} />
        </div>
        <div>
          <p className="text-lg font-black text-white">{TIER_LABEL[standing.poolTier] ?? standing.poolTier}</p>
          <p className="text-[10px] text-slate-500">Week {standing.weekKey}</p>
        </div>
      </div>

      {showLastWeekBanner && lastWeek && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 flex items-center justify-between gap-3 border ${
            lastWeek.promoted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
          }`}
        >
          <div className="flex items-center gap-2">
            {lastWeek.promoted ? (
              <ArrowUp size={16} className="text-emerald-400" />
            ) : (
              <ArrowDown size={16} className="text-rose-400" />
            )}
            <p className="text-xs font-bold text-white">
              {lastWeek.promoted ? 'Promoted' : 'Demoted'} last week ({TIER_LABEL[lastWeek.poolTier] ?? lastWeek.poolTier})
            </p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        {standing.members.map((m, i) => {
          const rank = i + 1;
          const inPromoteZone = rank <= zoneSize && size > zoneSize;
          const inDemoteZone = rank > size - zoneSize && size > zoneSize;
          return (
            <motion.div
              key={m.userId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                m.isCurrentUser ? 'bg-violet-electric/10 border border-violet-electric/30' : 'glass'
              }`}
            >
              <div className="w-6 text-center text-sm font-black text-slate-600">{rank}</div>
              <span className="text-lg">{m.avatarEmoji ?? '🙂'}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-200">
                  {m.username} {m.isCurrentUser && <span className="text-[10px] text-violet-400">(You)</span>}
                </p>
              </div>
              {inPromoteZone && <ArrowUp size={12} className="text-emerald-400" />}
              {inDemoteZone && <ArrowDown size={12} className="text-rose-400" />}
              <p className="text-sm font-black text-white">
                {m.liveWeeklyXp.toLocaleString()}
                <span className="text-[10px] font-bold text-slate-600 ml-1">XP</span>
              </p>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}

export default League;

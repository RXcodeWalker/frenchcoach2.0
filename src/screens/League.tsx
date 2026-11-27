import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp, CalendarDays, Shield, Trophy } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { InlineAlert } from '../components/auth/InlineAlert';
import { UsernameSetupModal } from '../components/ui/UsernameSetupModal';
import { enter, enterReduced } from '../components/motion/variants';
import { useAuth } from '../context/AuthContext';
import { PersonRow } from '../features/rankings/PersonRow';
import { useCatalogue } from '../services/shop/useCatalogue';
import { rarityOf, RARITY_COLOR } from '../services/shop/rarity';
import { track } from '../services/telemetry/telemetryService';
import { getMyLeague, lastWeekCardSeen, markLastWeekCardSeen } from '../services/league/leagueService';
import { lastWeekLine, myStandingLine, TIER_HUE, TIER_LABEL, zoneOf, type Zone } from '../features/league/leagueView';
import { timeUntil } from '../features/dailyChallenge/format';
import { LEAGUE_TIER_ORDER, type LeagueTier, type MyLeague } from '../types/league';
import type { RpcFailure } from '../lib/rpcFailure';

/**
 * Leagues (docs/systems/daily-challenge-and-leagues.md §3): this week's group, ranked by
 * the XP the server's ledger holds. Who is in the group, the ranks and the zones all come
 * from `get_my_league()`; the screen draws them and decides nothing.
 */

type Load = { name: 'loading' } | { name: 'signed-out' } | { name: 'failed'; reason: RpcFailure } | { name: 'ready'; league: MyLeague };

const card = 'rounded-card border border-hairline bg-surface';

function TierChip({ tier, size = 40 }: { tier: LeagueTier; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="topic-chip flex shrink-0 items-center justify-center"
      style={{ '--h': TIER_HUE[tier], width: size, height: size, borderRadius: 10 } as CSSProperties}
    >
      <Shield size={Math.round(size / 2)} strokeWidth={1.75} />
    </span>
  );
}

function TierLadder({ current }: { current: LeagueTier }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="League tiers">
      {LEAGUE_TIER_ORDER.map(t => (
        <li key={t} className="flex flex-col items-center gap-1" aria-current={t === current ? 'step' : undefined}>
          <span className={t === current ? '' : 'opacity-40'}>
            <TierChip tier={t} size={t === current ? 36 : 28} />
          </span>
          <span className={`text-caption ${t === current ? 'text-ink' : 'text-ink-subtle'}`}>{TIER_LABEL[t]}</span>
        </li>
      ))}
    </ol>
  );
}

const ZONE_NOTE: Record<Exclude<Zone, 'safe' | 'unranked'>, { Icon: typeof ArrowUp; label: string; className: string }> = {
  promote: { Icon: ArrowUp, label: 'Promotion zone', className: 'text-progress-text' },
  demote: { Icon: ArrowDown, label: 'Drop zone', className: 'text-correction-text' },
};

export function League() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const catalogue = useCatalogue();
  const [load, setLoad] = useState<Load>({ name: 'loading' });
  const [showUsername, setShowUsername] = useState(false);
  const [cardSeen, setCardSeen] = useState(false);
  const tracked = useRef(false);

  const nameStyle = useMemo(
    () => (itemId: string | null) => {
      const it = itemId ? catalogue.find(i => i.id === itemId) : undefined;
      return it ? { color: RARITY_COLOR[rarityOf(it)] } : undefined;
    },
    [catalogue],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoad({ name: 'signed-out' });
      return;
    }
    setLoad({ name: 'loading' });
    const result = await getMyLeague(userId);
    if (result.ok) {
      setCardSeen(result.league.lastWeek ? lastWeekCardSeen(result.league.lastWeek.weekKey) : true);
      setLoad({ name: 'ready', league: result.league });
      if (!tracked.current) {
        tracked.current = true;
        track({ name: 'league_viewed', props: { status: result.league.status, tier: result.league.tier } });
      }
    } else {
      setLoad(result.reason === 'signed_out' ? { name: 'signed-out' } : { name: 'failed', reason: result.reason });
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bar = (
    <TopContextBar title="Leagues" subtitle="This week’s group" showBack backLabel="Back to Rankings" onBack={() => navigate('/rankings')} />
  );

  if (load.name === 'loading') {
    return (
      <>
        {bar}
        <PageShell maxWidth="md" gap={16}>
          <div className={`${card} h-48`} aria-busy="true" data-testid="league-loading" />
        </PageShell>
      </>
    );
  }

  if (load.name === 'signed-out') {
    return (
      <>
        {bar}
        <PageShell maxWidth="md" gap={16}>
          <motion.section variants={item} className={`${card} p-6 text-center`}>
            <Trophy size={28} aria-hidden="true" className="mx-auto text-ink-subtle" />
            <h2 className="mt-3 text-section text-ink">Sign in to join a league</h2>
            <p className="mt-1 text-body-s text-ink-muted">Each week you’re grouped with learners at your level. Finish near the top to move up.</p>
            <div className="mt-5 flex justify-center">
              <Link to="/login" className="inline-flex h-11 items-center rounded-control bg-action px-5 text-label text-action-ink">Sign in</Link>
            </div>
          </motion.section>
        </PageShell>
      </>
    );
  }

  if (load.name === 'failed') {
    return (
      <>
        {bar}
        <PageShell maxWidth="md" gap={16}>
          <motion.section variants={item} className={`${card} space-y-4 p-6`} data-testid="league-failed">
            {load.reason === 'not_deployed' ? (
              <p className="text-body text-ink-muted">Leagues are being switched on. Check back soon.</p>
            ) : (
              <InlineAlert>{load.reason === 'offline' ? 'You’re offline. Leagues need a connection.' : 'Couldn’t load your league.'}</InlineAlert>
            )}
            <Button variant="secondary" onClick={() => void refresh()}>Try again</Button>
          </motion.section>
        </PageShell>
      </>
    );
  }

  const league = load.league;
  const cohort = league.cohort;
  const me = cohort?.members.find(m => m.isMe);
  const resetIn = timeUntil(league.resetsAt);
  const last = league.lastWeek && !cardSeen ? lastWeekLine(league.lastWeek) : null;

  return (
    <>
      {bar}
      <PageShell maxWidth="md" gap={16}>
        {showUsername && (
          <UsernameSetupModal
            onClose={() => {
              setShowUsername(false);
              void refresh();
            }}
          />
        )}

        {last && league.lastWeek && (
          <motion.section
            variants={item}
            role="status"
            data-testid="league-last-week"
            className={`flex items-start justify-between gap-3 rounded-card border p-4 ${
              last.tone === 'up' ? 'border-progress bg-progress-soft' : last.tone === 'down' ? 'border-correction bg-correction-soft' : 'border-hairline bg-surface'
            }`}
          >
            <p className={`flex items-start gap-2 text-body-s ${last.tone === 'up' ? 'text-progress-text' : last.tone === 'down' ? 'text-correction-text' : 'text-ink'}`}>
              {last.tone === 'up' ? <ArrowUp size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> : last.tone === 'down' ? <ArrowDown size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> : null}
              <span>{last.text}</span>
            </p>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                markLastWeekCardSeen(league.lastWeek!.weekKey);
                setCardSeen(true);
              }}
            >
              Got it
            </Button>
          </motion.section>
        )}

        <motion.section variants={item} className={`${card} p-5 md:p-6`} aria-label="Your league" data-testid="league-summary">
          <div className="flex items-center gap-4">
            <TierChip tier={league.tier} size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow uppercase text-ink-subtle">Your league</p>
              <p className="text-title text-ink">{TIER_LABEL[league.tier]}</p>
            </div>
            {cohort && me?.rank != null && (
              <div className="text-right">
                <p className="text-eyebrow uppercase text-ink-subtle">Rank</p>
                <p className="font-numeral text-title text-ink" data-testid="league-rank">#{me.rank}</p>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-control bg-surface-recessed p-3">
              <p className="text-caption text-ink-subtle">XP this week</p>
              <p className="mt-0.5 font-numeral text-section text-ink">{league.myWeeklyXp.toLocaleString()}</p>
            </div>
            <div className="rounded-control bg-surface-recessed p-3">
              <p className="text-caption text-ink-subtle">Week ends in</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 font-numeral text-section text-ink">
                <CalendarDays size={16} aria-hidden="true" className="text-ink-muted" />
                {resetIn ?? '–'}
              </p>
            </div>
          </div>
          {cohort && <p className="mt-4 text-body-s text-ink-muted" data-testid="league-standing">{myStandingLine(me, cohort)}</p>}
          {league.status === 'not_joined' && (
            <p className="mt-4 text-body-s text-ink-muted" data-testid="league-not-joined">
              Earn your first XP this week to join a {TIER_LABEL[league.tier]} group: answer a Learn question or take the{' '}
              <Link to="/daily-challenge" className="font-semibold text-action-text underline-offset-2 hover:underline">Daily Challenge</Link>.
            </p>
          )}
          {league.status === 'needs_username' && (
            <p className="mt-4 text-body-s text-ink-muted" data-testid="league-needs-username">
              Leagues show your username to the others in your group.{' '}
              <button type="button" onClick={() => setShowUsername(true)} className="font-semibold text-action-text underline-offset-2 hover:underline">Pick a username</button>{' '}
              to join.
            </p>
          )}
          {league.status === 'not_global' && (
            <p className="mt-4 text-body-s text-ink-muted" data-testid="league-not-global">
              Your leaderboard visibility hides you from other learners, so you aren’t placed in a league. Set it to Everyone in{' '}
              <Link to="/profile" className="font-semibold text-action-text underline-offset-2 hover:underline">Profile</Link> to join next time you earn XP.
            </p>
          )}
          <div className="mt-5 overflow-x-auto">
            <TierLadder current={league.tier} />
          </div>
        </motion.section>

        {cohort && (
          <motion.section variants={item} className={card} aria-labelledby="league-table">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline px-4 py-3">
              <h2 id="league-table" className="text-section text-ink">{TIER_LABEL[cohort.tier]} group</h2>
              <p className="text-caption text-ink-subtle">
                <span className="font-numeral">{cohort.activeMembers}</span> {cohort.activeMembers === 1 ? 'learner' : 'learners'} this week
                {cohort.mixed && ' · mixed levels'}
              </p>
            </div>
            <ul className="divide-y divide-hairline" data-testid="league-members">
              {cohort.members.map((m, i) => {
                const zone = zoneOf(m, cohort);
                const prev = i > 0 ? zoneOf(cohort.members[i - 1], cohort) : null;
                const note = zone === 'promote' || zone === 'demote' ? ZONE_NOTE[zone] : null;
                const showDivider = note && prev !== zone;
                return (
                  <Fragment key={`${m.rank ?? 'u'}-${m.username}-${i}`}>
                    {showDivider && (
                      <li className={`flex items-center gap-1.5 bg-surface-recessed px-4 py-1.5 text-caption ${note.className}`} aria-hidden="true">
                        <note.Icon size={12} /> {note.label}
                      </li>
                    )}
                    <PersonRow
                      username={m.username}
                      avatar={m.avatarEmoji}
                      frame={m.equippedFrame}
                      catalogue={catalogue}
                      nameStyle={nameStyle(m.equippedNameplate)}
                      isYou={m.isMe}
                      lead={
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill font-numeral text-label ${
                            m.rank === 1 ? 'bg-reward-soft text-reward-text' : 'bg-track text-ink-muted'
                          }`}
                          aria-label={m.rank ? `Rank ${m.rank}` : 'No XP yet'}
                        >
                          {m.rank ?? '–'}
                        </span>
                      }
                      note={cohort.mixed && m.standingTier !== cohort.tier ? `${TIER_LABEL[m.standingTier]} league` : note ? <span className={note.className}>{note.label}</span> : undefined}
                      trail={
                        <p className="shrink-0 text-right text-label text-ink">
                          <span className="font-numeral">{m.weeklyXp.toLocaleString()}</span>
                          <span className="ml-1 text-caption font-normal text-ink-subtle">XP</span>
                        </p>
                      }
                    />
                  </Fragment>
                );
              })}
            </ul>
            <p className="border-t border-hairline px-4 py-3 text-caption text-ink-subtle">
              Top <span className="font-numeral">{cohort.promoteCount}</span> with at least <span className="font-numeral">{cohort.promoteMinXp}</span> XP move up
              {cohort.demoteCount > 0 ? (
                <>; the bottom <span className="font-numeral">{cohort.demoteCount}</span> move down</>
              ) : (
                '; no one moves down in a group this small'
              )}
              . The table settles on Monday at 00:00 UTC.
            </p>
          </motion.section>
        )}
      </PageShell>
    </>
  );
}

export default League;

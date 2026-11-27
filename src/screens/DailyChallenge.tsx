import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Check, Flame, Trophy, Users, X } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Button } from '../components/ui/Button';
import { InlineAlert } from '../components/auth/InlineAlert';
import { UsernameSetupModal } from '../components/ui/UsernameSetupModal';
import { enter, enterReduced } from '../components/motion/variants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { track } from '../services/telemetry/telemetryService';
import {
  answerDailyChallengeItem,
  getDailyChallenge,
  startDailyChallenge,
} from '../services/dailyChallenge/dailyChallengeService';
import type { RpcFailure } from '../lib/rpcFailure';
import { ChallengePlay } from '../features/dailyChallenge/ChallengePlay';
import { ChallengeBoard } from '../features/dailyChallenge/ChallengeBoard';
import { answerWords, formatDuration, nextItem, scoreLine, streakLine, timeUntil, viewFor } from '../features/dailyChallenge/format';
import type { DailyChallengeItem, DailyChallengeState } from '../features/dailyChallenge/types';

/**
 * Daily Challenge (docs/systems/daily-challenge-and-leagues.md §2): the same eight
 * sentences for everyone on a UTC day, rebuilt from word tiles, one try each. The server
 * starts the clock, marks every answer, times the run, awards the XP and ranks the board;
 * this screen only shows what it says, so a reload resumes exactly where the learner was.
 */

type Load =
  | { name: 'loading' }
  | { name: 'signed-out' }
  | { name: 'failed'; reason: RpcFailure }
  | { name: 'ready'; state: DailyChallengeState };

const card = 'rounded-card border border-hairline bg-surface';

function failureCopy(reason: RpcFailure): string {
  switch (reason) {
    case 'not_deployed':
      return 'The Daily Challenge is being switched on. Check back soon.';
    case 'offline':
      return 'You’re offline. The Daily Challenge needs a connection.';
    default:
      return 'Couldn’t load today’s challenge.';
  }
}

export function DailyChallenge() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const { user } = useAuth();
  const { state: app } = useApp();
  const userId = user?.id ?? null;
  const [load, setLoad] = useState<Load>({ name: 'loading' });
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [marked, setMarked] = useState<DailyChallengeItem | null>(null);
  const [showUsername, setShowUsername] = useState(false);
  const reportedFinish = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoad({ name: 'signed-out' });
      return;
    }
    setLoad({ name: 'loading' });
    const result = await getDailyChallenge();
    setLoad(result.ok ? { name: 'ready', state: result.state } : result.reason === 'signed_out' ? { name: 'signed-out' } : { name: 'failed', reason: result.reason });
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const state = load.name === 'ready' ? load.state : null;
  const view = state ? (marked ? 'playing' : viewFor(state)) : null;

  // One event per finished run per page (volume: at most one per learner per day).
  useEffect(() => {
    const run = state?.run;
    if (!state || run?.status !== 'finished' || marked) return;
    if (reportedFinish.current === state.challengeDate) return;
    reportedFinish.current = state.challengeDate;
    track({
      name: 'daily_challenge_finished',
      props: { correct: run.correctCount, total: state.itemCount, duration_ms: run.durationMs ?? 0, flagged: run.flagged, xp: run.xpAwarded },
    });
  }, [state, marked]);

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    const result = await startDailyChallenge();
    setStarting(false);
    if (result.ok) {
      track({ name: 'daily_challenge_started', props: { streak: result.state.streak.current } });
      setLoad({ name: 'ready', state: result.state });
    } else {
      setLoad(result.reason === 'signed_out' ? { name: 'signed-out' } : { name: 'failed', reason: result.reason });
    }
  }

  async function handleCheck(position: number, tiles: number[]) {
    if (!state || checking) return;
    setChecking(true);
    setCheckError(null);
    const result = await answerDailyChallengeItem(state.challengeDate, position, tiles);
    setChecking(false);
    if (!result.ok) {
      if (result.reason === 'offline') setCheckError('Couldn’t reach the server. Your words are still here: try Check again.');
      else if (result.reason === 'signed_out') setLoad({ name: 'signed-out' });
      else void refresh();
      return;
    }
    setLoad({ name: 'ready', state: result.state });
    if (result.expired) {
      setMarked(null);
      return;
    }
    setMarked(result.state.items.find(i => i.position === position) ?? null);
  }

  const backBar = (
    <TopContextBar
      title="Daily Challenge"
      subtitle="Same sentences for everyone today"
      showBack
      backLabel="Back to Explore"
      onBack={() => navigate('/explore')}
    />
  );

  if (load.name === 'loading') {
    return (
      <>
        {backBar}
        <PageShell maxWidth="md" gap={16}>
          <div className={`${card} h-64`} aria-busy="true" data-testid="dc-loading" />
        </PageShell>
      </>
    );
  }

  if (load.name === 'signed-out') {
    return (
      <>
        {backBar}
        <PageShell maxWidth="md" gap={16}>
          <motion.section variants={item} className={`${card} p-6 text-center`}>
            <CalendarClock size={28} aria-hidden="true" className="mx-auto text-ink-subtle" />
            <h2 className="mt-3 text-section text-ink">Sign in to take part</h2>
            <p className="mt-1 text-body-s text-ink-muted">Everyone gets the same eight sentences each day. Your result goes on the day’s board.</p>
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
        {backBar}
        <PageShell maxWidth="md" gap={16}>
          <motion.section variants={item} className={`${card} space-y-4 p-6`} data-testid="dc-failed">
            {load.reason === 'not_deployed' ? (
              <p className="text-body text-ink-muted">{failureCopy(load.reason)}</p>
            ) : (
              <InlineAlert>{failureCopy(load.reason)}</InlineAlert>
            )}
            <Button variant="secondary" onClick={() => void refresh()}>Try again</Button>
          </motion.section>
        </PageShell>
      </>
    );
  }

  const s = load.state;
  const run = s.run;
  const resetIn = timeUntil(s.resetsAt);
  const streak = streakLine(s.streak, run?.status === 'finished');

  return (
    <>
      {backBar}
      <PageShell maxWidth="md" gap={16}>
        {showUsername && <UsernameSetupModal onClose={() => setShowUsername(false)} />}

        {view === 'intro' && (
          <motion.section variants={item} className={`${card} p-5 md:p-6`} aria-labelledby="dc-intro" data-testid="dc-intro">
            <p className="text-eyebrow uppercase text-ink-subtle">Today’s challenge</p>
            <h2 id="dc-intro" className="mt-1 text-title text-ink">Rebuild <span className="font-numeral">{s.itemCount}</span> French sentences</h2>
            <ul className="mt-4 space-y-2 text-body-s text-ink-muted">
              <li>Tap the words in the right order. Some words are there to trick you.</li>
              <li>One try per sentence. You see the right answer straight after.</li>
              <li>Most right answers wins; the faster time breaks a tie. Up to <span className="font-numeral">50</span> XP.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption text-ink-subtle">
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} aria-hidden="true" />
                <span><span className="font-numeral">{s.participants}</span> finished today</span>
              </span>
              {s.streak.current > 0 && (
                <span className="inline-flex items-center gap-1.5 text-streak-text">
                  <Flame size={14} aria-hidden="true" />
                  <span><span className="font-numeral">{s.streak.current}</span>-day streak</span>
                </span>
              )}
            </div>
            {streak && <p className="mt-3 text-body-s text-ink-muted">{streak}</p>}
            {!app.profile.username && (
              <p className="mt-3 text-body-s text-ink-muted">
                You’ll play without a place on the board until you{' '}
                <button type="button" onClick={() => setShowUsername(true)} className="font-semibold text-action-text underline-offset-2 hover:underline">pick a username</button>.
              </p>
            )}
            <div className="mt-6">
              <Button size="lg" onClick={() => void handleStart()} disabled={starting} data-testid="dc-start">
                {starting ? 'Starting…' : 'Start the challenge'}
              </Button>
            </div>
            <p className="mt-3 text-caption text-ink-subtle">The clock starts when you press Start. You have 20 minutes.</p>
          </motion.section>
        )}

        {view === 'playing' && run && (marked ?? nextItem(s)) && (
          <ChallengePlay
            item={(marked ?? nextItem(s)) as DailyChallengeItem}
            itemCount={s.itemCount}
            startedAt={run.startedAt}
            marked={marked}
            busy={checking}
            error={checkError}
            onCheck={tiles => void handleCheck((marked ?? nextItem(s))!.position, tiles)}
            onNext={() => {
              setMarked(null);
              setCheckError(null);
            }}
          />
        )}

        {view === 'done' && run && (
          <>
            <motion.section variants={item} className={`${card} p-5 md:p-6`} aria-labelledby="dc-result" data-testid="dc-result">
              <p className="text-eyebrow uppercase text-ink-subtle">Today’s result</p>
              <h2 id="dc-result" className="mt-1 text-title text-ink">{scoreLine(run.correctCount, s.itemCount)}</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-control bg-surface-recessed p-3">
                  <p className="text-caption text-ink-subtle">Time</p>
                  <p className="mt-0.5 font-numeral text-section text-ink">{formatDuration(run.durationMs ?? 0)}</p>
                </div>
                <div className="rounded-control bg-surface-recessed p-3">
                  <p className="text-caption text-ink-subtle">Place</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 font-numeral text-section text-ink">
                    <Trophy size={16} aria-hidden="true" className="text-reward-text" />
                    {run.rank ? `#${run.rank}` : '–'}
                  </p>
                </div>
                <div className="rounded-control bg-surface-recessed p-3">
                  <p className="text-caption text-ink-subtle">XP</p>
                  <p className="mt-0.5 font-numeral text-section text-reward-text">+{run.xpAwarded}</p>
                </div>
              </div>
              {run.flagged ? (
                <p className="mt-4 text-body-s text-correction-text">
                  This run was finished faster than anyone can read and tap, so it doesn’t count: no XP and no place on the board.
                </p>
              ) : (
                run.rank !== null && (
                  <p className="mt-4 text-body-s text-ink-muted">
                    #{run.rank} of <span className="font-numeral">{s.participants}</span> who finished today. Your XP counts towards this week’s league.
                  </p>
                )
              )}
              {streak && <p className="mt-2 text-body-s text-streak-text">{streak}</p>}
              {resetIn && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-caption text-ink-subtle">
                  <CalendarClock size={14} aria-hidden="true" /> New challenge in {resetIn}
                </p>
              )}
              <div className="mt-5">
                <Link to="/league" className="text-label text-action-text underline-offset-2 hover:underline">See your league</Link>
              </div>
            </motion.section>

            <motion.div variants={item}>
              <ChallengeBoard refreshKey={`${s.challengeDate}:${run.finishedAt ?? ''}`} />
            </motion.div>

            <motion.section variants={item} className={card} aria-labelledby="dc-review">
              <h2 id="dc-review" className="border-b border-hairline px-4 py-3 text-section text-ink">The sentences</h2>
              <ol className="divide-y divide-hairline">
                {s.items.map(it => (
                  <li key={it.position} className="flex gap-3 px-4 py-3">
                    <span className={`mt-0.5 shrink-0 ${it.answer?.correct ? 'text-progress-text' : 'text-correction-text'}`}>
                      {it.answer?.correct ? <Check size={16} aria-label="Right" /> : <X size={16} aria-label={it.answer ? 'Wrong' : 'Not answered'} />}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-body-s text-ink">{it.english}</p>
                      {it.solution && <p className="text-body-s text-ink" lang="fr">{it.solution.french}</p>}
                      {it.answer && !it.answer.correct && (
                        <p className="text-caption text-ink-subtle">You built: <span lang="fr">{answerWords(it, it.answer.tiles).join(' ')}</span></p>
                      )}
                      {!it.answer && <p className="text-caption text-ink-subtle">Not answered in time.</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </motion.section>
          </>
        )}
      </PageShell>
    </>
  );
}

export default DailyChallenge;

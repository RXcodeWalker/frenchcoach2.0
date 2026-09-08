import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Trophy, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { useAuth } from '../context/AuthContext';
import {
  getTodaysChallenge,
  hasCompletedToday,
  startDailyChallenge,
  submitDailyChallengeAttempt,
  getPendingClaim,
  clearPendingClaim,
  todayChallengeDate,
  type DailyChallengeAssignment,
} from '../services/dailyChallenge/dailyChallengeService';
import { getAuthoredQuestionSet } from '../data/exam/bank/loader';
import type { AuthoredQuestionSet } from '../data/exam/bank/types';
import { supabase, supabaseConfigured } from '../lib/supabase';

type ViewState = 'finishing-up' | 'loading' | 'empty' | 'completed' | 'preview' | 'starting' | 'error';

interface LeaderboardRow {
  userId: string;
  username: string;
  avatarEmoji: string | null;
  scoreTotal: number;
  xpAwarded: number;
}

export function DailyChallenge() {
  const { user } = useAuth();
  const authUserId = user?.id ?? null;
  const navigate = useNavigate();

  const [view, setView] = useState<ViewState>('loading');
  const [assignment, setAssignment] = useState<DailyChallengeAssignment | null>(null);
  const [authoredSet, setAuthoredSet] = useState<AuthoredQuestionSet | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [myResult, setMyResult] = useState<LeaderboardRow | null>(null);

  const loadNormalState = useCallback(async () => {
    setView('loading');
    const todaysAssignment = await getTodaysChallenge();
    if (!todaysAssignment) {
      setView('empty');
      return;
    }
    setAssignment(todaysAssignment);

    if (authUserId) {
      const completed = await hasCompletedToday(authUserId);
      if (completed) {
        await loadLeaderboard();
        setView('completed');
        return;
      }
    }

    const set = await getAuthoredQuestionSet(todaysAssignment.questionSetId);
    setAuthoredSet(set ?? null);
    setView('preview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  const loadLeaderboard = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('daily_challenge_leaderboard')
        .select('user_id, username, avatar_emoji, score_total, xp_awarded')
        .eq('challenge_date', todayChallengeDate())
        .order('score_total', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('[DailyChallenge] leaderboard fetch failed:', error.message);
        return;
      }
      const rows: LeaderboardRow[] = (data ?? []).map((r) => ({
        userId: r.user_id,
        username: r.username,
        avatarEmoji: r.avatar_emoji,
        scoreTotal: r.score_total,
        xpAwarded: r.xp_awarded,
      }));
      setLeaderboard(rows);
      setMyResult(rows.find((r) => r.userId === authUserId) ?? null);
    } catch (err) {
      console.warn('[DailyChallenge] leaderboard error:', err);
    }
  }, [authUserId]);

  // Recovery path (Fix 4): on every mount, check for an unclaimed pending
  // claim BEFORE rendering any normal state. If present, retry it — safe to
  // retry blindly since submit_daily_challenge_attempt is fully idempotent.
  useEffect(() => {
    void (async () => {
      const pending = getPendingClaim();
      if (!pending) {
        await loadNormalState();
        return;
      }
      setView('finishing-up');
      try {
        const result = await submitDailyChallengeAttempt(pending.challengeDate, pending.attemptId);
        if (result.ok) clearPendingClaim();
      } catch {
        // leave the pending claim in place; next visit retries again
      }
      await loadNormalState();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    if (!assignment) return;
    setView('starting');
    const result = await startDailyChallenge(assignment.challengeDate);
    if (!result.ok) {
      setView('error');
      return;
    }
    navigate('/exam', {
      state: {
        dailyChallengeDate: assignment.challengeDate,
        questionSetId: result.questionSetId,
        sessionId: result.sessionId,
      },
    });
  }

  if (view === 'loading' || view === 'finishing-up') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 text-ink-muted text-sm">
          {view === 'finishing-up' ? 'Finishing up your last challenge…' : 'Loading…'}
        </div>
      </PageShell>
    );
  }

  if (view === 'empty') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 space-y-2">
          <CalendarClock size={28} className="mx-auto text-ink-subtle" />
          <p className="text-sm font-bold text-white">No challenge yet today</p>
          <p className="text-xs text-ink-muted">Come back soon — today's challenge is on its way.</p>
        </div>
      </PageShell>
    );
  }

  if (view === 'error') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 space-y-2">
          <p className="text-sm font-bold text-white">Couldn't start the challenge</p>
          <button onClick={() => void loadNormalState()} className="text-xs text-violet-400 font-bold underline underline-offset-2">
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="sm">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Daily Challenge</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Today's Challenge</h1>
        <p className="text-sm text-ink-muted mt-1">One set. One shot per day. Everyone gets the same question.</p>
      </div>

      {view === 'completed' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 text-center"
          >
            <Trophy size={28} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-sm font-bold text-white">Challenge complete</p>
            {myResult && (
              <p className="text-xs text-ink-muted mt-1">
                Scored {myResult.scoreTotal}/40 · +{myResult.xpAwarded} XP
              </p>
            )}
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white px-1">Today's Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <p className="text-xs text-ink-subtle text-center py-8">No one's finished today's challenge yet.</p>
            ) : (
              leaderboard.map((row, i) => (
                <div
                  key={row.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl ${row.userId === authUserId ? 'bg-violet-electric/10 border border-violet-electric/30' : 'glass'}`}
                >
                  <span className="w-5 text-center text-xs font-black text-ink-subtle">{i + 1}</span>
                  <span className="text-lg">{row.avatarEmoji ?? '🙂'}</span>
                  <span className="flex-1 text-xs font-bold text-slate-200">{row.username}</span>
                  <span className="text-xs font-black text-white">{row.scoreTotal}/40</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(view === 'preview' || view === 'starting') && authoredSet && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 glass-elevated space-y-4"
        >
          <div>
            <h3 className="text-sm font-bold text-white">{authoredSet.content.rolePlay.title}</h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">{authoredSet.content.rolePlay.setup}</p>
          </div>
          <button
            onClick={() => void handleStart()}
            disabled={view === 'starting'}
            className="w-full btn-primary py-3 rounded-xl font-bold text-xs disabled:opacity-50"
          >
            {view === 'starting' ? 'Starting…' : 'Start Today’s Challenge'}
          </button>
        </motion.div>
      )}

      {(view === 'preview' || view === 'starting') && !authoredSet && (
        <div className="text-center py-12 text-ink-subtle text-sm">Couldn't load today's question set.</div>
      )}
    </PageShell>
  );
}

export default DailyChallenge;

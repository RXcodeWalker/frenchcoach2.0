import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Clock, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { useAuth } from '../context/AuthContext';
import {
  getDuel,
  syncDuelStatus,
  respondDuelChallenge,
  startDuelAttempt,
  submitDuelAttempt,
  getPendingDuelClaim,
  clearPendingDuelClaim,
  isTerminalClaimReason,
} from '../services/duels/duelsService';
import type { DuelChallenge } from '../types/duels';

type ViewState =
  | 'loading' | 'finishing-up' | 'error'
  | 'pending-invite' | 'waiting-for-response'
  | 'ready-to-play' | 'waiting-for-opponent'
  | 'completed' | 'expired';

export function DuelDetail() {
  const { duelId } = useParams<{ duelId: string }>();
  const { user } = useAuth();
  const authUserId = user?.id ?? null;
  const navigate = useNavigate();

  const [view, setView] = useState<ViewState>('loading');
  const [duel, setDuel] = useState<DuelChallenge | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadNormalState = useCallback(async () => {
    if (!duelId) return;
    setView('loading');

    await syncDuelStatus(duelId);
    const row = await getDuel(duelId);
    if (!row) {
      setView('error');
      return;
    }
    setDuel(row);

    const iAmChallenger = row.challengerId === authUserId;
    const iAmOpponent = row.opponentId === authUserId;

    if (row.status === 'pending' && iAmOpponent) {
      setView('pending-invite');
    } else if (row.status === 'pending' && iAmChallenger) {
      setView('waiting-for-response');
    } else if (row.status === 'completed') {
      setView('completed');
    } else if (row.status === 'expired') {
      setView('expired');
    } else if (row.status === 'accepted') {
      const myAttempt = iAmChallenger ? row.myAttempt : row.opponentAttempt;
      setView(myAttempt ? 'waiting-for-opponent' : 'ready-to-play');
    } else {
      // declined / cancelled
      setView('error');
    }
  }, [duelId, authUserId]);

  // Recovery path, mirroring DailyChallenge.tsx's Fix 4 pattern: check for an
  // unclaimed pending claim for THIS duel before rendering any normal state.
  // On a terminal-clear reason, clear it and continue rather than retrying
  // forever — the duel may have already resolved out from under this claim
  // (e.g. via the opponent's forfeit-resolution).
  useEffect(() => {
    if (!duelId) return;
    void (async () => {
      const pending = getPendingDuelClaim(duelId);
      if (!pending) {
        await loadNormalState();
        return;
      }
      setView('finishing-up');
      try {
        const result = await submitDuelAttempt(duelId, pending.attemptId);
        if (result.ok || (!result.ok && isTerminalClaimReason(result.reason))) {
          clearPendingDuelClaim(duelId);
        }
      } catch {
        // leave the pending claim in place; next visit retries again
      }
      await loadNormalState();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId]);

  async function handleAccept() {
    if (!duelId) return;
    setActionBusy(true);
    await respondDuelChallenge(duelId, 'accept');
    setActionBusy(false);
    await loadNormalState();
  }

  async function handleDecline() {
    if (!duelId) return;
    setActionBusy(true);
    await respondDuelChallenge(duelId, 'decline');
    setActionBusy(false);
    await loadNormalState();
  }

  async function handleStart() {
    if (!duelId || !duel) return;
    setActionBusy(true);
    const result = await startDuelAttempt(duelId);
    setActionBusy(false);
    if (!result.ok) {
      setView('error');
      return;
    }
    navigate('/exam', {
      state: {
        duelId,
        questionSetId: result.questionSetId,
        sessionId: result.sessionId,
      },
    });
  }

  if (view === 'loading' || view === 'finishing-up') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 text-slate-500 text-sm">
          {view === 'finishing-up' ? 'Finishing up your last duel…' : 'Loading…'}
        </div>
      </PageShell>
    );
  }

  if (view === 'error') {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 space-y-2">
          <p className="text-sm font-bold text-white">Couldn't load this duel</p>
          <button onClick={() => void loadNormalState()} className="text-xs text-violet-400 font-bold underline underline-offset-2">
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  if (!duel) {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center py-24 text-slate-500 text-sm">Duel not found.</div>
      </PageShell>
    );
  }

  const iAmChallenger = duel.challengerId === authUserId;
  const opponentName = iAmChallenger ? duel.opponentUsername : duel.challengerUsername;
  const opponentAvatar = (iAmChallenger ? duel.opponentAvatarEmoji : duel.challengerAvatarEmoji) ?? '🙂';
  const myResult = iAmChallenger ? duel.myAttempt : duel.opponentAttempt;
  const theirResult = iAmChallenger ? duel.opponentAttempt : duel.myAttempt;
  const iWon = duel.winnerUserId === authUserId;

  return (
    <PageShell maxWidth="sm">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Swords size={14} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Friend Duel</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">vs {opponentName}</h1>
      </div>

      {view === 'pending-invite' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 glass-elevated space-y-4 text-center">
          <span className="text-3xl">{opponentAvatar}</span>
          <p className="text-sm font-bold text-white">{opponentName} challenged you to a duel</p>
          <div className="flex gap-3">
            <button
              onClick={() => void handleDecline()}
              disabled={actionBusy}
              className="flex-1 py-3 rounded-xl font-bold text-xs border border-slate-700 text-slate-300 disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={() => void handleAccept()}
              disabled={actionBusy}
              className="flex-1 btn-primary py-3 rounded-xl font-bold text-xs disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}

      {view === 'waiting-for-response' && (
        <div className="text-center py-16 space-y-2">
          <Clock size={24} className="mx-auto text-slate-600" />
          <p className="text-sm font-bold text-white">Waiting for {opponentName} to respond</p>
        </div>
      )}

      {view === 'ready-to-play' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 glass-elevated space-y-4 text-center">
          <p className="text-sm font-bold text-white">Ready when you are</p>
          <button
            onClick={() => void handleStart()}
            disabled={actionBusy}
            className="w-full btn-primary py-3 rounded-xl font-bold text-xs disabled:opacity-50"
          >
            {actionBusy ? 'Starting…' : 'Start Duel'}
          </button>
        </motion.div>
      )}

      {view === 'waiting-for-opponent' && (
        <div className="text-center py-16 space-y-2">
          <Clock size={24} className="mx-auto text-slate-600" />
          <p className="text-sm font-bold text-white">Waiting for {opponentName} to finish</p>
          {myResult && <p className="text-xs text-slate-500">You scored {myResult.scoreTotal}/40</p>}
        </div>
      )}

      {view === 'expired' && (
        <div className="text-center py-16 space-y-2">
          <XCircle size={24} className="mx-auto text-slate-600" />
          <p className="text-sm font-bold text-white">This duel expired</p>
        </div>
      )}

      {view === 'completed' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className={`rounded-2xl p-6 border text-center ${duel.isTie ? 'border-slate-500/20 bg-slate-500/5' : iWon ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
            <Trophy size={28} className={`mx-auto mb-2 ${duel.isTie ? 'text-slate-400' : iWon ? 'text-emerald-400' : 'text-slate-600'}`} />
            <p className="text-sm font-bold text-white">
              {duel.isTie ? 'It’s a tie!' : iWon ? 'You won!' : `${opponentName} won`}
            </p>
            {myResult && (
              <p className="text-xs text-slate-400 mt-1">
                You: {myResult.scoreTotal}/40 · +{myResult.xpAwarded} XP
                {myResult.outcome === 'forfeit_win' && ' (forfeit)'}
              </p>
            )}
            {theirResult && (
              <p className="text-xs text-slate-500 mt-0.5">
                {opponentName}: {theirResult.scoreTotal}/40
              </p>
            )}
          </div>
        </motion.div>
      )}
    </PageShell>
  );
}

export default DuelDetail;

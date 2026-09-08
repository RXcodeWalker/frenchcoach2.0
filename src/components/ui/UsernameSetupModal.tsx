import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AtSign, Loader2, CheckCircle2 } from 'lucide-react';
import { claimUsername, isValidUsername } from '../../services/social/usernameService';
import { useApp } from '../../context/AppContext';

interface UsernameSetupModalProps {
  onClose: () => void;
}

const REASON_COPY: Record<string, string> = {
  invalid_format: 'Start with a letter, 3–20 characters, letters/numbers/underscore only.',
  reserved_client_side: 'That name is reserved. Try another.',
  already_set: 'You already have a username.',
  taken: 'That username is already taken.',
  throttled: 'You can only change your username once every 30 days.',
  offline: 'You need to be signed in to claim a username.',
  not_signed_in: 'Your session has expired. Sign in again to claim a username.',
  unknown: 'Something went wrong. Try again.',
};

// Shown on first visit to Rankings while username === null (plan §3.1, §6).
// Never blocks Learn, Exam, or Home — this is the only place it's mounted.
export const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({ onClose }) => {
  const { dispatch, state } = useApp();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidUsername(value);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await claimUsername(value);
    setSubmitting(false);
    if (result.ok) {
      dispatch({ type: 'SET_PROFILE', profile: { ...state.profile, username: value } });
      onClose();
    } else {
      setError(REASON_COPY[result.reason]);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-navy/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm glass-elevated rounded-[2rem] border-white/10 overflow-hidden"
        >
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-electric/10 flex items-center justify-center text-violet-400 border border-violet-electric/20">
                <AtSign size={18} />
              </div>
              <h2 className="text-base font-black text-white">Claim your username</h2>
            </div>
            <button onClick={onClose} className="text-ink-muted hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-ink-muted">
              Pick a name other learners will see on the leaderboard and in friend requests.
            </p>

            <div className="relative">
              <input
                autoFocus
                value={value}
                onChange={e => { setValue(e.target.value); setError(null); }}
                placeholder="marie_92"
                maxLength={20}
                className="w-full bg-navy-300/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-violet-electric/50 transition-colors"
              />
              {valid && (
                <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
              )}
            </div>

            {error && <p className="text-[11px] text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={!valid || submitting}
              className="w-full py-3 rounded-xl bg-violet-electric text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Claim username
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-center text-[11px] text-ink-subtle hover:text-ink-muted transition-colors"
            >
              Maybe later
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

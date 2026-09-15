import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { redeemInviteCode, InviteError } from '../services/account/inviteService';

/**
 * Phase 3 — the invite-code gate screen. Gated in front of everything else
 * by InviteGateCheck (App.tsx). This is UX only: real enforcement happens
 * server-side inside consume_ai_quota, so a wrong/exhausted code here just
 * means "try again," never a security boundary in itself.
 */
export function InviteCode() {
  const navigate = useNavigate();
  const { refreshInviteStatus, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await redeemInviteCode(code.trim());
      if (!result.granted) {
        setError("That code isn't valid, or it's already been used up.");
        setSubmitting(false);
        return;
      }
      await refreshInviteStatus();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof InviteError ? 'Something went wrong. Try again.' : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm rounded-2xl surface-raised p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="text-center mb-2">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
              <Ticket size={18} className="text-violet-400" />
            </div>
            <h1 className="text-lg font-black text-white mb-1">You'll need an invite code</h1>
            <p className="text-xs text-ink-subtle">We're in a limited early launch — enter your code to continue.</p>
          </div>

          <input
            type="text"
            required
            autoFocus
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-navy-300 text-white placeholder:text-ink-subtle text-xs text-center tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />

          {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-bold disabled:opacity-60"
          >
            {submitting ? 'Checking…' : 'Continue'}
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full text-center text-[11px] text-ink-subtle"
          >
            Sign out
          </button>
        </form>
      </motion.div>
    </div>
  );
}

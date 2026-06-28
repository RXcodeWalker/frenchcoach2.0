import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, LogIn, LogOut, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

interface Props {
  onClose: () => void;
}

type Step = 'idle' | 'sending' | 'sent' | 'error';

export function AuthModal({ onClose }: Props) {
  const { authUser } = useApp();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSendLink() {
    if (!email.trim()) return;
    setStep('sending');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    if (error) {
      setErrorMsg(error.message);
      setStep('error');
    } else {
      setStep('sent');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm glass border border-white/10 rounded-2xl p-6 shadow-2xl"
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>

          {authUser ? (
            /* Signed-in state */
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Mail size={20} className="text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-white break-all">{authUser.email}</p>
                <p className="text-[10px] text-emerald-400 mt-1">Progress syncing to cloud</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          ) : step === 'sent' ? (
            /* Magic link sent */
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle size={36} className="text-emerald-400" />
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-slate-400 text-sm">
                We sent a magic link to <span className="text-white">{email}</span>. Click it to sign in — your progress will sync automatically.
              </p>
              <button
                onClick={() => { setStep('idle'); setEmail(''); }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors mt-1"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* Sign-in form */
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-0.5">Sync your progress</h2>
                <p className="text-slate-400 text-xs">
                  Sign in with a magic link to back up XP, achievements, and gems across devices.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendLink()}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition"
                />
              </div>

              {step === 'error' && (
                <p className="text-red-400 text-xs">{errorMsg}</p>
              )}

              <button
                onClick={handleSendLink}
                disabled={step === 'sending' || !email.trim()}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {step === 'sending' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogIn size={15} />
                )}
                {step === 'sending' ? 'Sending…' : 'Send magic link'}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                No password needed. Guest mode keeps working without sign-in.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

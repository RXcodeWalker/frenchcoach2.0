import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Only reachable via AuthCallback's post-recovery redirect, so a valid
// recovery session already exists — no re-login needed after updateUser.
export function ResetPassword() {
  const { updateUserPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 bg-gradient-to-br from-slate-100 via-blue-50/30 to-violet-50/20 flex items-center justify-center p-4">
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 shadow-[0_0_24px_rgba(124,58,237,0.4)] mb-3">
            <span className="text-2xl">🇫🇷</span>
          </div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900">Set a new password</h1>
        </div>

        <div className="rounded-2xl dark:bg-slate-900/60 bg-white/70 backdrop-blur-xl border dark:border-white/8 border-slate-200 shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                autoComplete="new-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-white text-slate-900 placeholder:dark:text-slate-600 placeholder:text-slate-400 border dark:border-white/6 border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:dark:text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-white text-slate-900 placeholder:dark:text-slate-600 placeholder:text-slate-400 border dark:border-white/6 border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

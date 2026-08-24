import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGuestMode } from '../hooks/useGuestMode';

export function Auth() {
  const { signIn, signUp, resetPasswordForEmail, signInWithOAuth, configError } = useAuth();
  const { isGuest, enterGuestMode, exitGuestMode } = useGuestMode();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { redirect?: string } | null)?.redirect ?? '/';
  const isGuestConversion = isGuest && location.pathname === '/login';

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
        exitGuestMode();
        navigate(redirectTo, { replace: true });
      } else {
        const result = await signUp(email, password);
        if (result.needsConfirmation) {
          setNeedsConfirmation(true);
        } else {
          exitGuestMode();
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    enterGuestMode();
    navigate(redirectTo, { replace: true });
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  function handleCancelConversion() {
    navigate('/', { replace: true });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetLoading(true);
    try {
      await resetPasswordForEmail(email);
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 bg-gradient-to-br from-slate-100 via-blue-50/30 to-violet-50/20 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 dark:bg-blue-600/8 bg-violet-400/6 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 dark:bg-cyan-500/5 bg-blue-300/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 dark:bg-blue-800/6 bg-indigo-300/6 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 shadow-[0_0_24px_rgba(124,58,237,0.4)] mb-3">
            <span className="text-2xl">🇫🇷</span>
          </div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900">FrenchCoach</h1>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">IGCSE & A-Level Speaking Practice</p>
        </div>

        <div className="rounded-2xl dark:bg-slate-900/60 bg-white/70 backdrop-blur-xl border dark:border-white/8 border-slate-200 shadow-2xl p-6">
          {/* Config error state */}
          {configError ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <p className="font-semibold dark:text-white text-slate-900 text-sm">App not configured</p>
              <p className="text-xs dark:text-slate-400 text-slate-500">Supabase environment variables are missing. Contact the developer.</p>
            </div>
          ) : needsConfirmation ? (
            /* Email confirmation notice */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-400" />
              </div>
              <p className="font-semibold dark:text-white text-slate-900 text-sm">Check your inbox</p>
              <p className="text-xs dark:text-slate-400 text-slate-500">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
              <button
                className="mt-2 text-xs text-violet-400 underline underline-offset-2"
                onClick={() => setNeedsConfirmation(false)}
              >
                Back to login
              </button>
            </div>
          ) : forgotPassword ? (
            resetSent ? (
              /* Password reset email sent notice */
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle size={20} className="text-emerald-400" />
                </div>
                <p className="font-semibold dark:text-white text-slate-900 text-sm">Check your inbox</p>
                <p className="text-xs dark:text-slate-400 text-slate-500">We sent a password reset link to <strong>{email}</strong>.</p>
                <button
                  className="mt-2 text-xs text-violet-400 underline underline-offset-2"
                  onClick={() => { setForgotPassword(false); setResetSent(false); }}
                >
                  Back to login
                </button>
              </div>
            ) : (
              /* Forgot password form */
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-xs dark:text-slate-400 text-slate-500 mb-1">Enter your email and we'll send you a link to reset your password.</p>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {resetLoading ? 'Sending…' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotPassword(false); setError(null); }}
                  className="w-full text-center text-xs text-violet-400 underline underline-offset-2"
                >
                  Back to login
                </button>
              </form>
            )
          ) : (
            <>
              {isGuestConversion && (
                <button
                  type="button"
                  onClick={handleCancelConversion}
                  className="mb-4 text-xs text-violet-400 underline underline-offset-2"
                >
                  ← Cancel — back to your guest session
                </button>
              )}

              {/* Tab switcher */}
              <div className="flex rounded-lg dark:bg-slate-800/60 bg-slate-100 p-0.5 mb-5">
                {(['login', 'signup'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(null); }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${tab === t ? 'dark:bg-slate-700 bg-white dark:text-white text-slate-900 shadow-sm' : 'dark:text-slate-500 text-slate-400'}`}
                  >
                    {t === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Email */}
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-white text-slate-900 placeholder:dark:text-slate-600 placeholder:text-slate-400 border dark:border-white/6 border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
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

                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(true); setError(null); }}
                    className="block text-xs text-violet-400 underline underline-offset-2"
                  >
                    Forgot password?
                  </button>
                )}

                {/* Confirm Password (signup only) */}
                <AnimatePresence>
                  {tab === 'signup' && (
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-white text-slate-900 placeholder:dark:text-slate-600 placeholder:text-slate-400 border dark:border-white/6 border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error message */}
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
                  {loading ? (tab === 'login' ? 'Logging in…' : 'Creating account…') : (tab === 'login' ? 'Log In' : 'Create Account')}
                </button>
              </form>

              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px dark:bg-white/8 bg-slate-200" />
                <span className="text-[10px] dark:text-slate-500 text-slate-400 font-medium">OR</span>
                <div className="flex-1 h-px dark:bg-white/8 bg-slate-200" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  aria-label="Continue with Google"
                  className="w-full py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-white text-slate-900 text-xs font-bold border dark:border-white/6 border-slate-200 hover:dark:bg-slate-800 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('azure')}
                  aria-label="Continue with Microsoft"
                  className="w-full py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-white text-slate-900 text-xs font-bold border dark:border-white/6 border-slate-200 hover:dark:bg-slate-800 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
                    <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
                    <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
                    <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
                  </svg>
                  Continue with Microsoft
                </button>
              </div>

              {!isGuestConversion && (
                <>
                  <button
                    type="button"
                    onClick={handleGuest}
                    className="w-full mt-3 py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-slate-300 text-slate-700 text-xs font-bold border dark:border-white/6 border-slate-200 hover:dark:bg-slate-800 hover:bg-slate-200 transition-all"
                  >
                    Continue as Guest
                  </button>
                  <p className="text-[10px] dark:text-slate-500 text-slate-400 text-center mt-2">
                    Guest data stays on this device only — it isn't backed up, and clearing your browser storage will erase it.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

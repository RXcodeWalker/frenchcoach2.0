import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGuestMode } from '../hooks/useGuestMode';
import { AuthForm } from '../components/auth/AuthForm';

export function Auth() {
  const { isGuest, enterGuestMode, exitGuestMode } = useGuestMode();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { redirect?: string } | null)?.redirect ?? '/';
  const isGuestConversion = isGuest && location.pathname === '/login';

  function handleAuthenticated() {
    exitGuestMode();
    navigate(redirectTo, { replace: true });
  }

  function handleGuest() {
    enterGuestMode();
    navigate(redirectTo, { replace: true });
  }

  function handleCancelConversion() {
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 bg-gradient-to-br from-slate-100 via-blue-50/30 to-violet-50/20 flex items-center justify-center p-4">
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
          <h1 className="text-2xl font-black dark:text-white text-slate-900">Français AI</h1>
          <p className="text-sm dark:text-ink-muted text-ink-muted mt-1">IGCSE & A-Level Speaking Practice</p>
        </div>

        <div className="rounded-2xl dark:bg-slate-900/60 bg-white/70 backdrop-blur-xl border dark:border-white/8 border-slate-200 shadow-2xl p-6">
          {isGuestConversion && (
            <button
              type="button"
              onClick={handleCancelConversion}
              className="mb-4 text-xs text-violet-400 underline underline-offset-2"
            >
              ← Cancel — back to your guest session
            </button>
          )}

          <AuthForm
            onAuthenticated={handleAuthenticated}
            footer={
              !isGuestConversion && (
                <>
                  <button
                    type="button"
                    onClick={handleGuest}
                    className="w-full mt-3 py-2.5 rounded-lg dark:bg-slate-800/60 bg-slate-100 dark:text-ink-muted text-ink-subtle text-xs font-bold border dark:border-white/6 border-slate-200 hover:dark:bg-slate-800 hover:bg-slate-200 transition-all"
                  >
                    Continue as Guest
                  </button>
                  <p className="text-[10px] dark:text-ink-muted text-ink-muted text-center mt-2">
                    Guest data stays on this device only — it isn't backed up, and clearing your browser storage will erase it.
                  </p>
                </>
              )
            }
          />
        </div>
      </motion.div>
    </div>
  );
}

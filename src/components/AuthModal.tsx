import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthForm } from './auth/AuthForm';

interface Props {
  onClose: () => void;
}

export function AuthModal({ onClose }: Props) {
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
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
            className="absolute top-4 right-4 text-ink-muted hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>

          {user ? (
            /* Signed-in state */
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Mail size={20} className="text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-xs text-ink-muted mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-white break-all">{user.email}</p>
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
          ) : (
            /* Sign-in form */
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-0.5">Sync your progress</h2>
                <p className="text-ink-muted text-xs">
                  Sign in to back up XP, achievements, and gems across devices.
                </p>
              </div>

              <AuthForm onAuthenticated={onClose} />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

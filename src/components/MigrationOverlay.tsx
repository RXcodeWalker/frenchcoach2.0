import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import type { MigrationPhase } from '../services/sync/migrationService';

interface Props {
  migrationPhase: MigrationPhase | null;
  onSkip: () => void;
}

const PHASES: { key: MigrationPhase; label: string }[] = [
  { key: 'progression', label: 'Syncing your progress...' },
  { key: 'sessions',   label: 'Uploading session history...' },
  { key: 'evidence',   label: 'Syncing coach data...' },
];

const ORDER: MigrationPhase[] = ['progression', 'sessions', 'evidence', 'complete'];

function phaseIndex(phase: MigrationPhase): number {
  return ORDER.indexOf(phase);
}

export function MigrationOverlay({ migrationPhase, onSkip }: Props) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowSkip(true), 30_000);
    return () => clearTimeout(id);
  }, []);

  if (migrationPhase === null) return null;

  const currentIndex = phaseIndex(migrationPhase);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">Setting up your account</h2>
          <p className="text-sm text-ink-muted mb-6">Uploading your guest progress to the cloud…</p>

          <div className="space-y-4">
            {PHASES.map(({ key, label }) => {
              const idx = phaseIndex(key);
              const done = currentIndex > idx;
              const active = currentIndex === idx;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {done ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : active ? (
                      <Loader2 size={16} className="text-violet-400 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <span className={`text-sm ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-ink-muted'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {showSkip && (
              <motion.button
                className="mt-6 w-full text-xs text-ink-muted hover:text-slate-200 transition-colors py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onSkip}
              >
                Continue without waiting
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

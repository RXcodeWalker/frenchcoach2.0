import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIEngine } from '../../types';

const ENGINE_LABEL: Record<AIEngine, string> = {
  gemini: 'Gemini',
  groq: 'Groq',
  offline: 'Offline',
};

const ENGINE_ICON: Record<AIEngine, string> = {
  gemini: '✦',
  groq: '⚡',
  offline: '📴',
};

const ENGINE_COLOR: Record<AIEngine, string> = {
  gemini: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  groq: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  offline: 'text-ink-muted bg-slate-400/10 border-slate-400/20',
};

const ENGINE_RING: Record<AIEngine, string> = {
  gemini: 'border-amber-400/40 bg-amber-400/5',
  groq: 'border-violet-400/40 bg-violet-500/5',
  offline: 'border-slate-500/30 bg-slate-500/5',
};

interface Props {
  engine: AIEngine;
  disabled?: boolean;
  onSwitch: (engine: AIEngine) => void;
}

const ALL_ENGINES: AIEngine[] = ['gemini', 'groq', 'offline'];

export function EngineIndicatorPill({ engine, disabled, onSwitch }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold transition-all ${ENGINE_COLOR[engine]} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
        whileTap={disabled ? {} : { scale: 0.95 }}
        title={disabled ? 'Cannot switch while evaluating' : `Using ${ENGINE_LABEL[engine]} — click to switch`}
      >
        <span>{ENGINE_ICON[engine]}</span>
        <span>{ENGINE_LABEL[engine]}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-2 z-50 w-48 rounded-2xl surface-raised border border-white/10 shadow-xl overflow-hidden"
            >
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wider px-3 pt-3 pb-1">
                Switch engine (next eval)
              </p>
              {ALL_ENGINES.map(e => (
                <button
                  key={e}
                  onClick={() => { onSwitch(e); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${e === engine ? 'bg-white/5' : ''}`}
                >
                  <span className={`text-xs w-5 text-center ${ENGINE_COLOR[e].split(' ')[0]}`}>{ENGINE_ICON[e]}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${e === engine ? ENGINE_COLOR[e].split(' ')[0] : 'text-ink-muted'}`}>
                      {ENGINE_LABEL[e]}
                    </p>
                  </div>
                  {e === engine && (
                    <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${ENGINE_RING[e]} border`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </span>
                  )}
                </button>
              ))}
              <p className="text-[9px] text-ink-subtle px-3 pb-3 pt-1">Takes effect on next recording</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

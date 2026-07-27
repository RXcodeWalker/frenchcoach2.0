import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { displayScore } from '../../domain/scoring';
import type { AIEngine, EngineResult } from '../../types';

const ENGINE_LABEL: Record<AIEngine, string> = { gemini: 'Gemini', groq: 'Groq', offline: 'Offline' };
const ENGINE_ICON: Record<AIEngine, string> = { gemini: '✦', groq: '⚡', offline: '📴' };

const ENGINE_TAB_COLOR: Record<AIEngine, string> = {
  gemini: 'border-amber-400/60 text-amber-300 bg-amber-400/10',
  groq: 'border-violet-400/60 text-violet-300 bg-violet-400/10',
  offline: 'border-slate-500/40 text-slate-300 bg-slate-500/10',
};
const ENGINE_TAB_INACTIVE = 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5';

const CONFIDENCE_LABEL: Record<AIEngine, string> = {
  gemini: 'High confidence',
  groq: 'Medium · High',
  offline: 'Limited',
};

interface Props {
  engineResults: Map<AIEngine, EngineResult>;
  activeEngine: AIEngine | null;
  isReEvaluating: boolean;
  reEvaluatingEngine: AIEngine | null;
  onSwitchEngine: (engine: AIEngine) => void;
  onReEvaluate: (engine: AIEngine) => void;
}

const ALL_ENGINES: AIEngine[] = ['gemini', 'groq', 'offline'];

export function ReEvaluateBar({
  engineResults,
  activeEngine,
  isReEvaluating,
  reEvaluatingEngine,
  onSwitchEngine,
  onReEvaluate,
}: Props) {
  const evaluatedEngines = Array.from(engineResults.keys());
  const unevaluatedEngines = ALL_ENGINES.filter(e => !engineResults.has(e));

  return (
    <div className="space-y-3">
      {/* Engine tabs — only when ≥2 results */}
      <AnimatePresence>
        {evaluatedEngines.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Compare evaluations</p>
            <div className="flex gap-1.5 flex-wrap">
              {evaluatedEngines.map(engine => {
                const result = engineResults.get(engine)!;
                const score = displayScore(result.feedback);
                const isActive = engine === activeEngine;
                return (
                  <button
                    key={engine}
                    onClick={() => onSwitchEngine(engine)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                      isActive ? ENGINE_TAB_COLOR[engine] : ENGINE_TAB_INACTIVE
                    }`}
                  >
                    <span>{ENGINE_ICON[engine]}</span>
                    <span>{ENGINE_LABEL[engine]}</span>
                    <span className={`text-[10px] font-black ${isActive ? '' : 'text-slate-600'}`}>
                      {score === null ? 'not graded' : `${score}/10`}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Confidence indicator for active engine */}
            {activeEngine && (
              <p className="text-[10px] text-slate-500">
                {ENGINE_ICON[activeEngine]} {ENGINE_LABEL[activeEngine]} · {CONFIDENCE_LABEL[activeEngine]}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-evaluate buttons for unevaluated engines */}
      {unevaluatedEngines.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Get another opinion</p>
          <div className="flex gap-2 flex-wrap">
            {unevaluatedEngines.map(engine => {
              const isLoading = isReEvaluating && reEvaluatingEngine === engine;
              return (
                <motion.button
                  key={engine}
                  onClick={() => !isReEvaluating && onReEvaluate(engine)}
                  disabled={isReEvaluating}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl glass-subtle text-[11px] font-semibold transition-all ${
                    isReEvaluating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 text-slate-300'
                  }`}
                  whileTap={isReEvaluating ? {} : { scale: 0.96 }}
                >
                  {isLoading ? (
                    <Loader2 size={11} className="animate-spin text-violet-400" />
                  ) : (
                    <span>{ENGINE_ICON[engine]}</span>
                  )}
                  <span>{isLoading ? `Evaluating…` : `Re-evaluate with ${ENGINE_LABEL[engine]}`}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* All engines done */}
      {unevaluatedEngines.length === 0 && evaluatedEngines.length > 1 && (
        <p className="text-[10px] text-emerald-500/70">✓ All engines evaluated — switch tabs above to compare</p>
      )}
    </div>
  );
}

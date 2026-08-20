import { motion } from 'framer-motion';
import type { AIEngine, EngineHealth } from '../../types';

interface EngineOption {
  engine: AIEngine;
  label: string;
  badge: string;
  tagline: string;
  speedHint: string;
  confidence: string;
  badgeColor: string;
  ringColor: string;
  icon: string;
}

const ENGINE_OPTIONS: EngineOption[] = [
  {
    engine: 'gemini',
    label: 'Gemini',
    badge: 'Premium',
    tagline: 'Most detailed feedback',
    speedHint: '~20 s',
    confidence: 'High confidence',
    badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    ringColor: 'border-amber-400/60 bg-amber-400/5',
    icon: '✦',
  },
  {
    engine: 'groq',
    label: 'Groq',
    badge: 'Free',
    tagline: 'Fast & accurate',
    speedHint: '~7 s',
    confidence: 'Medium · High',
    badgeColor: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    ringColor: 'border-violet-500/60 bg-violet-500/5',
    icon: '⚡',
  },
  {
    engine: 'offline',
    label: 'Offline',
    badge: 'No internet',
    tagline: 'Works anywhere',
    speedHint: 'Instant',
    confidence: 'Limited',
    badgeColor: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    ringColor: 'border-slate-500/40 bg-slate-500/5',
    icon: '📴',
  },
];

function HealthDot({ status }: { status: EngineHealth }) {
  if (status === 'checking') {
    return (
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse inline-block" title="Checking…" />
    );
  }
  if (status === 'healthy') {
    return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="Healthy" />;
  }
  if (status === 'degraded') {
    return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" title="Running slow" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" title="Unavailable" />;
}

function healthLabel(status: EngineHealth, engine: AIEngine): string {
  if (engine === 'offline') return 'Always available';
  if (status === 'checking') return 'Checking…';
  if (status === 'healthy') return 'Healthy';
  if (status === 'degraded') return 'Running slow';
  return 'Unavailable';
}

interface Props {
  selected: AIEngine;
  health: Record<AIEngine, EngineHealth>;
  onChange: (engine: AIEngine) => void;
}

export function ModelSelectorCard({ selected, health, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
        Choose how your answer is evaluated
      </p>

      <div className="grid grid-cols-3 gap-2">
        {ENGINE_OPTIONS.map(({ engine, label, badge, tagline, speedHint, confidence, badgeColor, ringColor, icon }) => {
          const isSelected = selected === engine;
          const engineHealth = health[engine];
          const isUnavailable = engineHealth === 'unavailable';

          return (
            <motion.button
              key={engine}
              onClick={() => !isUnavailable && onChange(engine)}
              disabled={isUnavailable}
              className={`
                relative flex flex-col gap-1.5 p-3 rounded-2xl border-2 text-left transition-all duration-200
                ${isSelected ? ringColor + ' border-2' : 'glass-subtle border-transparent hover:border-white/10'}
                ${isUnavailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
              whileTap={isUnavailable ? {} : { scale: 0.97 }}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <span className="text-[8px] text-white font-black">✓</span>
                </motion.div>
              )}

              {/* Icon */}
              <span className="text-lg leading-none">{icon}</span>

              {/* Label + badge */}
              <div>
                <p className="text-xs font-black text-white leading-tight">{label}</p>
                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border mt-0.5 ${badgeColor}`}>
                  {badge}
                </span>
              </div>

              {/* Tagline */}
              <p className="text-[10px] text-slate-400 leading-snug">{tagline}</p>

              {/* Speed */}
              <p className="text-[10px] text-slate-600 font-medium">{speedHint}</p>

              {/* Confidence */}
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">{confidence}</p>

              {/* Health indicator */}
              <div className="flex items-center gap-1 mt-0.5">
                <HealthDot status={engineHealth} />
                <span className="text-[9px] text-slate-500">{healthLabel(engineHealth, engine)}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {health[selected] === 'degraded' && selected !== 'offline' && (
        <p className="text-[10px] text-amber-400 px-1">
          ⚠ {selected.charAt(0).toUpperCase() + selected.slice(1)} may be slow right now. Groq will be used as backup.
        </p>
      )}
    </div>
  );
}

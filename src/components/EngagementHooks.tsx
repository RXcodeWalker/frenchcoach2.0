import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Trophy, Sparkles, Flame, Zap } from 'lucide-react';

export type HookType = 'streak' | 'goal' | 'achievement' | 'milestone' | 'suggestion' | 'challenge';

interface HookProps {
  type: HookType;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  onClose: () => void;
}

export const EngagementHook = forwardRef<HTMLDivElement, HookProps>(function EngagementHook({ type, title, description, cta, onClick, onClose }: HookProps, ref) {
  const configs = {
    streak: { icon: <Flame className="text-orange-400" />, border: 'border-orange-500/30', bg: 'bg-orange-500/5', accent: 'text-orange-400' },
    goal: { icon: <Target className="text-blue-400" />, border: 'border-blue-500/30', bg: 'bg-blue-500/5', accent: 'text-blue-400' },
    achievement: { icon: <Trophy className="text-amber-400" />, border: 'border-amber-500/30', bg: 'bg-amber-500/5', accent: 'text-amber-400' },
    milestone: { icon: <Sparkles className="text-emerald-400" />, border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', accent: 'text-emerald-400' },
    suggestion: { icon: <Sparkles className="text-violet-400" />, border: 'border-violet-500/30', bg: 'bg-violet-500/5', accent: 'text-violet-400' },
    challenge: { icon: <Zap className="text-pink-400" />, border: 'border-pink-500/30', bg: 'bg-pink-500/5', accent: 'text-pink-400' },
  };

  const config = configs[type];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`glass-elevated ${config.border} p-4 mb-3 w-80 relative overflow-hidden group`}
    >
      <div className={`absolute inset-0 ${config.bg} opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="relative flex gap-3">
        <div className={`w-10 h-10 rounded-xl glass border-white/5 flex items-center justify-center shrink-0`}>
          {config.icon}
        </div>
        
        <div className="flex-1">
          <h4 className="text-white font-bold text-sm mb-0.5">{title}</h4>
          <p className="text-ink-muted text-xs mb-3 leading-relaxed">{description}</p>
          
          <button
            onClick={onClick}
            className={`text-[10px] font-black uppercase tracking-widest ${config.accent} flex items-center gap-1.5 group/btn`}
          >
            {cta}
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </button>
        </div>

        <button 
          onClick={onClose}
          className="text-ink-subtle hover:text-white transition-colors"
        >
          <XIcon size={14} />
        </button>
      </div>
    </motion.div>
  );
});

export function HookStack({ hooks }: { hooks: HookProps[] }) {
  return (
    <div className="fixed top-6 right-6 z-[90] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {hooks.map((hook, i) => (
            <EngagementHook key={hook.title + i} {...hook} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

import type { Variants, Transition } from 'framer-motion';

export const shakeAnimation = {
  x: [-4, 4, -4, 4, 0],
};

export const shakeTransition: Transition = { duration: 0.4 };

export const countdownPopVariants: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.5 },
};

export type AccentColor = 'amber' | 'orange' | 'blue' | 'red' | 'yellow' | 'purple' | 'violet';

const ACCENT_TIMER_BAR: Record<string, { normal: string; critical: string; overdrive: string }> = {
  amber: { normal: 'bg-blue-500', critical: 'bg-red-500', overdrive: 'bg-amber-400' },
  orange: { normal: 'bg-orange-500', critical: 'bg-red-500', overdrive: 'bg-orange-400' },
  blue: { normal: 'bg-blue-500', critical: 'bg-red-500', overdrive: 'bg-blue-400' },
  red: { normal: 'bg-red-500', critical: 'bg-red-500', overdrive: 'bg-red-400' },
};

export function getTimerBarColor(
  accentColor: AccentColor = 'amber',
  isCritical: boolean,
  isOverdrive = false
): string {
  const palette = ACCENT_TIMER_BAR[accentColor] ?? ACCENT_TIMER_BAR.amber;
  if (isCritical) return palette.critical;
  if (isOverdrive) return palette.overdrive;
  return palette.normal;
}

export function getOverdriveClasses(active: boolean): string {
  return active
    ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
    : 'border-amber-500/20';
}

export function getOverdriveCardClasses(active: boolean): string {
  return active
    ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
    : '';
}

export function getOverdriveStreakClasses(active: boolean): string {
  return active
    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
    : 'bg-orange-500/20 text-orange-400 border-orange-500/30';
}

const MODE_CARD_COLORS: Record<string, string> = {
  yellow: 'hover:border-yellow-500/50 group-hover:bg-yellow-500/10',
  blue: 'hover:border-blue-500/50 group-hover:bg-blue-500/10',
  purple: 'hover:border-purple-500/50 group-hover:bg-purple-500/10',
  red: 'hover:border-red-500/50 group-hover:bg-red-500/10',
  violet: 'hover:border-violet-500/50 hover:bg-violet-500/5',
};

export function getModeCardClasses(color: string): string {
  return MODE_CARD_COLORS[color] ?? MODE_CARD_COLORS.blue;
}

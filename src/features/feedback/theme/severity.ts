import type { Severity } from '../../../types';

export const SEVERITY_COLOR: Record<Severity, string> = {
  major:     '#EF4444',
  minor:     '#F59E0B',
  polish:    '#A78BFA',
  anglicism: '#A78BFA',
  strong:    '#10B981',
};

export const SEVERITY_UNDERLINE: Record<Severity, string> = {
  major:     'underline decoration-red-400 decoration-wavy underline-offset-2',
  minor:     'underline decoration-amber-400 decoration-wavy underline-offset-2',
  polish:    'underline decoration-violet-400 decoration-dotted underline-offset-2',
  anglicism: 'underline decoration-violet-300 decoration-dotted underline-offset-2',
  strong:    'underline decoration-emerald-400 decoration-solid underline-offset-2',
};

export const SEVERITY_BG: Record<Severity, string> = {
  major:     'bg-red-500/10 border-red-500/20',
  minor:     'bg-amber-500/10 border-amber-500/20',
  polish:    'bg-violet-500/10 border-violet-500/20',
  anglicism: 'bg-violet-500/10 border-violet-500/20',
  strong:    'bg-emerald-500/10 border-emerald-500/20',
};

import type { Level } from '../types';

export const LEVELS: { level: Level; minXP: number; maxXP: number; color: string; icon: string }[] = [
  { level: 'Beginner', minXP: 0, maxXP: 500, color: '#64748b', icon: '🌱' },
  { level: 'Intermediate', minXP: 500, maxXP: 1500, color: '#0ea5e9', icon: '📚' },
  { level: 'Advanced', minXP: 1500, maxXP: 3500, color: '#f59e0b', icon: '🔥' },
  { level: 'Expert', minXP: 3500, maxXP: 7000, color: '#10b981', icon: '⚡' },
  { level: 'Beast Mode', minXP: 7000, maxXP: 99999, color: '#ef4444', icon: '👑' },
];

export const getLevelInfo = (totalXP: number) => {
  const current = LEVELS.find(l => totalXP >= l.minXP && totalXP < l.maxXP) || LEVELS[LEVELS.length - 1];
  const next = LEVELS[LEVELS.indexOf(current) + 1];
  const progressInLevel = totalXP - current.minXP;
  const levelRange = (next?.minXP ?? current.maxXP) - current.minXP;
  const progress = Math.min((progressInLevel / levelRange) * 100, 100);
  return { current, next, progress, progressInLevel, levelRange };
};

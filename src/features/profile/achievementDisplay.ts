import type { LucideIcon } from 'lucide-react';
import {
  Award, CalendarCheck, CalendarDays, ClipboardCheck, Compass, Crown, Dumbbell, Flame, Gem, Globe, GraduationCap,
  Medal, MessageCircle, Mic, Microscope, SpellCheck, Star, Trophy, Wrench, Zap,
} from 'lucide-react';
import type { Achievement } from '../../types';

/**
 * Display for Profile's achievements (Design System v2): a lucide icon per
 * achievement — replacing the emoji in `ACHIEVEMENT_DEFINITIONS`, which stays
 * as data — and, where the app keeps a count, how close a locked one is.
 */
const ICONS: Record<string, LucideIcon> = {
  premier_pas: Mic,
  cinq_sessions: CalendarDays,
  dix_sessions: CalendarCheck,
  marathonien: Trophy,
  triple_jour: Zap,
  semaine_parfaite: Flame,
  fluent: Star,
  perfectionniste: Gem,
  polyglotte: Globe,
  examinateur: ClipboardCheck,
  grand_oral: GraduationCap,
  expert: Award,
  bete_de_mode: Crown,
  grammaire_maitrisee: SpellCheck,
  probleme_resolu: Wrench,
  drill_master: Dumbbell,
  curieux: Microscope,
  explorateur: Compass,
  causeur: MessageCircle,
  niveau_b2: Medal,
};

export function achievementIcon(id: string): LucideIcon {
  return ICONS[id] ?? Award;
}

export interface AchievementCounts {
  sessions: number;
  streak: number;
  xp: number;
  topicsPractised: number;
  bestScore: number | null;
  examsCompleted: number;
}

/** current/max for achievements the app can measure; null when there is no honest number (mastery, drills, hidden features). */
export function achievementProgress(id: string, c: AchievementCounts): { current: number; max: number } | null {
  const of = (current: number, max: number) => ({ current: Math.min(current, max), max });
  switch (id) {
    case 'premier_pas': return of(c.sessions, 1);
    case 'cinq_sessions': return of(c.sessions, 5);
    case 'dix_sessions': return of(c.sessions, 10);
    case 'marathonien': return of(c.sessions, 50);
    case 'triple_jour': return of(c.streak, 3);
    case 'semaine_parfaite': return of(c.streak, 7);
    case 'fluent': return of(c.bestScore !== null && c.bestScore >= 8 ? 1 : 0, 1);
    case 'polyglotte': return of(c.topicsPractised, 8);
    case 'examinateur': return of(c.examsCompleted, 1);
    case 'expert': return of(c.xp, 1500);
    default: return null;
  }
}

export interface AchievementTile {
  achievement: Achievement;
  Icon: LucideIcon;
  progress: { current: number; max: number } | null;
  /** 0–1 toward unlocking; 1 when unlocked. */
  fraction: number;
}

/**
 * Tiles for the grid: unlocked first, then locked ones closest to unlocking.
 * A hidden achievement stays out of the list until it is unlocked.
 */
export function achievementTiles(achievements: Achievement[], hiddenIds: ReadonlySet<string>, counts: AchievementCounts): AchievementTile[] {
  const tiles = achievements
    .filter(a => a.unlocked || !hiddenIds.has(a.id))
    .map(a => {
      const progress = a.unlocked ? null : achievementProgress(a.id, counts);
      return { achievement: a, Icon: achievementIcon(a.id), progress, fraction: a.unlocked ? 1 : progress ? progress.current / progress.max : 0 };
    });
  return [...tiles.filter(t => t.achievement.unlocked), ...tiles.filter(t => !t.achievement.unlocked).sort((a, b) => b.fraction - a.fraction)];
}

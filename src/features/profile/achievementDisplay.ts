import type { LucideIcon } from 'lucide-react';
import {
  Award, BarChart3, CalendarCheck, CalendarDays, CalendarHeart, ClipboardCheck, Compass, Crown, Dumbbell, Flame, Gem, Globe,
  GraduationCap, Hand, Medal, MessageCircle, MessagesSquare, Mic, Microscope, RotateCcw, SpellCheck, Star, TrendingUp, Trophy,
  Wrench, Zap,
} from 'lucide-react';
import type { Achievement } from '../../types';
import { DEVELOPED_ANSWER_WORDS } from '../../data/achievements';

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
  regulier: CalendarHeart,
  fidele: CalendarCheck,
  developpe: MessagesSquare,
  autocorrection: RotateCcw,
  en_progres: TrendingUp,
  le_retour: Hand,
  remontee: BarChart3,
};

export function achievementIcon(id: string): LucideIcon {
  return ICONS[id] ?? Award;
}

export interface AchievementCounts {
  sessions: number;
  streak: number;
  xp: number;
  topicsPractised: number;
  rolePlaysPractised: number;
  bestScore: number | null;
  examsCompleted: number;
  /** Counted (Exam Sim) attempts — Grand Oral's progress. */
  countedExams: number;
  daysPractised: number;
  longestAnswerWords: number;
}

/**
 * current/max for achievements the app can measure; null when there is no
 * honest number (mastery, drills, hidden features, and Fluent: its unlock
 * reads the marked score of a counted answer, which the stored best score
 * does not reflect, so a 1/1 bar could sit on a locked tile).
 */
export function achievementProgress(id: string, c: AchievementCounts): { current: number; max: number } | null {
  const of = (current: number, max: number) => ({ current: Math.min(current, max), max });
  switch (id) {
    case 'premier_pas': return of(c.sessions, 1);
    case 'curieux': return of(c.topicsPractised, 3);
    case 'dix_sessions': return of(c.sessions, 10);
    case 'marathonien': return of(c.sessions, 50);
    case 'triple_jour': return of(c.streak, 3);
    case 'semaine_parfaite': return of(c.streak, 7);
    case 'regulier': return of(c.daysPractised, 10);
    case 'fidele': return of(c.daysPractised, 30);
    case 'developpe': return of(c.longestAnswerWords, DEVELOPED_ANSWER_WORDS);
    case 'polyglotte': return of(c.topicsPractised, 8);
    case 'examinateur': return of(c.examsCompleted, 1);
    case 'grand_oral': return of(c.countedExams, 1);
    case 'explorateur': return of(c.rolePlaysPractised, 1);
    case 'causeur': return of(c.rolePlaysPractised, 5);
    case 'expert': return of(c.xp, 1500);
    case 'bete_de_mode': return of(c.xp, 7000);
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

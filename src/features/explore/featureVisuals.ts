import type { LucideIcon } from 'lucide-react';
import {
  AudioLines, BarChart3, Bot, Brain, Building2, CalendarDays, Dices, Ear, Flame, Gauge, GitBranch, Gift,
  GraduationCap, Handshake, Map, Medal, MessagesSquare, Mic, Mountain, Newspaper, Palmtree, Puzzle, Radar,
  Rocket, Search, ShoppingBag, Smile, Sparkles, Swords, Target, Thermometer, Timer, Trophy, Users, Wrench, Zap,
  BookOpen, Briefcase, CloudRain, Plane, Shield, ShoppingBasket, Stethoscope, Ticket,
} from 'lucide-react';

/**
 * Display for Explore's tiles (Design System v2): a lucide icon per feature —
 * replacing the emoji and hex colour in `FEATURES`, which stay as data — and
 * one hue per category. The hue is used only inside the icon chip (the
 * `.topic-chip` OKLCH ground/ink pair), never for text, borders or fills.
 */
const ICONS: Record<string, LucideIcon> = {
  practice: BookOpen,
  ai_chat: Bot,
  exam_sim: GraduationCap,
  pronunciation: Mic,
  listening: Ear,
  speaking: AudioLines,
  daily_news: Newspaper,
  grammar_repair: Wrench,
  accent: Target,
  scenario_arch: Building2,
  fluency_heat: Thermometer,
  sentence_rebuild: Puzzle,
  weakness: Search,
  missions: CalendarDays,
  xp_shop: ShoppingBag,
  achievements: Trophy,
  challenges: Swords,
  leaderboard: BarChart3,
  seasonal: Sparkles,
  skill_tree: GitBranch,
  roadmap: Map,
  mastery: Rocket,
  analytics: Radar,
  timeline: Gauge,
  rapid_fire: Zap,
  boss_battle: Flame,
  story_mode: Brain,
  emoji_master: Smile,
  mystery_box: Gift,
  survival: Palmtree,
  speed: Timer,
  word_drop: CloudRain,
  friends: Handshake,
  groups: Users,
  rankings: Medal,
  shared: MessagesSquare,
};

const CATEGORY_HUES: Record<string, number> = {
  'Core Learning': 270,
  'AI Tools': 202,
  Gamification: 67,
  Progression: 157,
  'Fun Modes': 22,
  Community: 337,
};

export function featureIcon(id: string): LucideIcon {
  return ICONS[id] ?? Dices;
}

export function categoryHue(category: string): number {
  return CATEGORY_HUES[category] ?? 270;
}

/** A role-play scenario's chip in the Scenarios view, by its category. */
const SCENARIO_VISUALS: Record<string, { Icon: LucideIcon; hue: number }> = {
  Basics: { Icon: ShoppingBasket, hue: 67 },
  Services: { Icon: Building2, hue: 202 },
  Health: { Icon: Stethoscope, hue: 0 },
  Travel: { Icon: Plane, hue: 225 },
  Leisure: { Icon: Ticket, hue: 315 },
  Professional: { Icon: Briefcase, hue: 292 },
  Safety: { Icon: Shield, hue: 135 },
};

export function scenarioVisual(category: string): { Icon: LucideIcon; hue: number } {
  return SCENARIO_VISUALS[category] ?? { Icon: Mountain, hue: 270 };
}

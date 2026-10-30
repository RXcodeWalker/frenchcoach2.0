import type { LucideIcon } from 'lucide-react';
import {
  AudioLines, Bot, Brain, Building2, CalendarDays, Dices, Ear, Flame, Gift,
  Handshake, Map, Medal, Mountain, Newspaper, Palmtree, Puzzle, 
  Rocket, Search, ShoppingBag, Smile, Sparkles, Swords, Target, Thermometer, Timer, Users, Wrench, Zap,
  Briefcase, CloudRain, Plane, Shield, ShoppingBasket, Stethoscope, Ticket,
} from 'lucide-react';

/**
 * Display for Explore's tiles (Design System v2): a lucide icon per feature —
 * replacing the emoji and hex colour in `FEATURES`, which stay as data — and
 * one hue per category. The hue is used only inside the icon chip (the
 * `.topic-chip` OKLCH ground/ink pair), never for text, borders or fills.
 */
const ICONS: Record<string, LucideIcon> = {
  ai_chat: Bot,
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
  challenges: Swords,
  seasonal: Sparkles,
  roadmap: Map,
  mastery: Rocket,
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
};

const CATEGORY_HUES: Record<string, number> = {
  'Speak & Listen': 270,
  'Words & Grammar': 22,
  'Insights & Plan': 157,
  'Compete & Rewards': 67,
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

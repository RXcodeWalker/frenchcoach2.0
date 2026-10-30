import { ArrowLeftRight, Keyboard, ListChecks, Swords, Timer, type LucideIcon } from 'lucide-react';
import type { EmojiCategory, GameMode } from './types';

export interface ModeMeta {
  title: string;
  /** One line on the picker. */
  blurb: string;
  /** What to do, shown on the get-ready screen. */
  rule: string;
  /** Name for the run's score ("Damage" in the Arena). */
  scoreLabel: string;
  Icon: LucideIcon;
}

export const MODE_META: Record<GameMode, ModeMeta> = {
  arena: {
    title: 'Emoji Arena',
    blurb: 'Duel an emoji spirit. Type the French to strike; a miss costs a life.',
    rule: 'Type the French word to strike. Three lives. Five in a row doubles your damage.',
    scoreLabel: 'Damage',
    Icon: Swords,
  },
  classic: {
    title: 'Classic',
    blurb: 'Emoji to French, multiple choice. Ten questions.',
    rule: 'Pick the French word for each emoji. Ten questions.',
    scoreLabel: 'Score',
    Icon: ListChecks,
  },
  reverse: {
    title: 'Reverse',
    blurb: 'French to emoji. Solidify the mapping both ways.',
    rule: 'Pick the emoji that matches each French word. Ten questions.',
    scoreLabel: 'Score',
    Icon: ArrowLeftRight,
  },
  hardcore: {
    title: 'Hardcore',
    blurb: 'Type the French word before the timer runs out.',
    rule: 'Type the French word. Each question has its own timer. Ten questions.',
    scoreLabel: 'Score',
    Icon: Keyboard,
  },
  blitz: {
    title: 'Speed Blitz',
    blurb: '60 seconds. How many can you decode?',
    rule: 'Type as many French words as you can in 60 seconds.',
    scoreLabel: 'Score',
    Icon: Timer,
  },
};

export const CATEGORIES: { id: EmojiCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'animals', label: 'Animals' },
  { id: 'objects', label: 'Objects' },
  { id: 'nature', label: 'Nature' },
  { id: 'activities', label: 'Activities' },
  { id: 'sentences', label: 'Sentences' },
];

/** The Arena opponent, by category. Emoji are the game's content here, not chrome. */
export const SPIRIT_BY_CATEGORY: Record<EmojiCategory, string> = {
  all: '🎨',
  food: '🥐',
  animals: '🐯',
  objects: '📦',
  nature: '🌲',
  activities: '🎯',
  sentences: '💬',
};

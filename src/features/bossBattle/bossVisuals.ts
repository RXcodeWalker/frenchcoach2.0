import type { LucideIcon } from 'lucide-react';
import { Crown, Flame, Ghost, Heart, Hourglass, Mountain, Shield, Sword, Users, Wand2, Zap } from 'lucide-react';
import type { BossDifficulty, BossId } from './bosses';
import { MEND_AMOUNT, MEND_COST, POWER_COST, type Move } from './engine';

/**
 * Display for Boss Battle (Design System v2): a lucide icon per boss and per
 * move — replacing the emoji of the first version — and one OKLCH hue per boss
 * used only inside the boss's chip (`.topic-chip`), never for text, borders or
 * fills. Colour anywhere else comes from the role tokens.
 */
const BOSS_VISUALS: Record<BossId, { Icon: LucideIcon; hue: number }> = {
  gender: { Icon: Crown, hue: 350 },
  past_tense: { Icon: Hourglass, hue: 65 },
  negation: { Icon: Ghost, hue: 275 },
  pronouns: { Icon: Users, hue: 165 },
  future: { Icon: Mountain, hue: 225 },
  conditional: { Icon: Flame, hue: 30 },
  subjunctive: { Icon: Wand2, hue: 305 },
};

export function bossVisual(id: BossId): { Icon: LucideIcon; hue: number } {
  return BOSS_VISUALS[id];
}

export const MOVE_VISUALS: Record<Move, { Icon: LucideIcon; label: string; effect: string; cost: string | null }> = {
  strike: { Icon: Sword, label: 'Strike', effect: 'Hit the boss.', cost: null },
  power: { Icon: Zap, label: 'Power', effect: 'Double damage. A miss hurts more.', cost: `${POWER_COST} Focus` },
  guard: { Icon: Shield, label: 'Guard', effect: 'Block the next hit. No damage.', cost: null },
  mend: { Icon: Heart, label: 'Mend', effect: `Heal ${MEND_AMOUNT} health.`, cost: `${MEND_COST} Focus` },
};

/** What the main button says for the chosen move. */
export const MOVE_ACTION: Record<Move, string> = {
  strike: 'Strike',
  power: 'Power strike',
  guard: 'Raise guard',
  mend: 'Mend',
};

/** Difficulty reads through the role colours: easy = progress, medium = reward, hard = correction. */
export const DIFFICULTY_STYLE: Record<BossDifficulty, { label: string; className: string }> = {
  easy: { label: 'Easy', className: 'border-progress text-progress-text' },
  medium: { label: 'Medium', className: 'border-reward text-reward-text' },
  hard: { label: 'Hard', className: 'border-correction text-correction-text' },
};

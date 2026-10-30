import type { ShopItem } from '../../types/shop';

/** Shop plan §5: "~50" gems for a standard (10-question) sitting — the documented average used for "≈N more sessions" copy (§8, §11 C). */
export const AVG_GEMS_PER_SESSION = 50;

export type PriceState =
  | { kind: 'locked' }
  | { kind: 'affordable'; price: number; after: number }
  | { kind: 'short'; price: number; short: number; sessions: number };

/** Whole practice sessions it takes to earn `short` more gems (at least one). */
export function sessionsToEarn(short: number): number {
  return Math.max(1, Math.ceil(short / AVG_GEMS_PER_SESSION));
}

/** What the buy control says about an item the learner doesn't own yet. */
export function priceState(price: number, balance: number, unlocked: boolean): PriceState {
  if (!unlocked) return { kind: 'locked' };
  if (balance >= price) return { kind: 'affordable', price, after: balance - price };
  const short = price - balance;
  return { kind: 'short', price, short, sessions: sessionsToEarn(short) };
}

/** Where a locked item's requirement can be advanced (Shop plan §8: "a deep link to the practice that advances it"). */
export function practiceLinkFor(achievement: string | undefined): { to: string; label: string } {
  switch (achievement) {
    case 'examinateur':
    case 'grand_oral':
      return { to: '/exam', label: 'Go to Exam' };
    case 'causeur':
      return { to: '/explore', label: 'Find a role play' };
    default:
      return { to: '/learn', label: 'Practise in Learn' };
  }
}

export function isEquippableKind(kind: ShopItem['kind']): kind is 'avatar' | 'frame' | 'nameplate' {
  return kind === 'avatar' || kind === 'frame' || kind === 'nameplate';
}

export const IDENTITY_SECTIONS: { kind: 'avatar' | 'frame' | 'nameplate'; title: string; note: string }[] = [
  { kind: 'avatar', title: 'Avatars', note: 'Shown beside your name on rankings' },
  { kind: 'frame', title: 'Frames', note: 'A ring around your avatar' },
  { kind: 'nameplate', title: 'Nameplates', note: 'Your username in a rarity colour' },
];

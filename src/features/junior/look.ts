/** What Léo wears and stands in front of: the visible reward of a complete sticker set (junior-track §10). */
import type { JuniorBank, JuniorUnlock } from '../../data/junior/types';
import type { JuniorState } from '../../domain/junior/state';

export interface LeoLook {
  /** Emoji shown on Léo, or null. */
  accessory: string | null;
  /** The unlocked background, or null. */
  background: JuniorUnlock | null;
}

/** Unlocks are earned once per theme and never lost; the most recent of each kind is worn. */
export function leoLook(bank: Pick<JuniorBank, 'themes'>, junior: Pick<JuniorState, 'unlocks'>): LeoLook {
  const owned = bank.themes.map((t) => t.unlock).filter((u) => junior.unlocks.includes(u.id));
  const rank = (u: JuniorUnlock) => junior.unlocks.indexOf(u.id);
  const latest = (kind: JuniorUnlock['kind']) => owned.filter((u) => u.kind === kind).sort((a, b) => rank(b) - rank(a))[0] ?? null;
  return { accessory: latest('outfit')?.emoji ?? null, background: latest('background') };
}

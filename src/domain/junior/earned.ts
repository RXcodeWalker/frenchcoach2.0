/**
 * What a kid has already earned on a theme, in the shape `rewards.nextReward`
 * takes — derived from the persisted `JuniorState`, which keeps each earned
 * sticker id once (`stickers`) and a finished-mission count per theme
 * (`missionsDone`). Gold versions are not stored separately: every finished
 * mission beyond the set size was a gold one, so the gold count is the
 * difference. Like rewards.ts this never sees an outcome.
 */
import type { JuniorTheme } from '../../data/junior/types';
import type { EarnedSticker } from './rewards';
import type { JuniorState } from './state';

export function earnedStickers(theme: JuniorTheme, junior: Pick<JuniorState, 'stickers' | 'missionsDone'>): EarnedSticker[] {
  const ids = new Set(theme.stickers.map((s) => s.id));
  const normal = (junior.stickers[theme.id] ?? []).filter((id) => ids.has(id));
  const goldCount = Math.max(0, (junior.missionsDone[theme.id] ?? 0) - normal.length);
  const first = theme.stickers[0]?.id;
  return [
    ...normal.map((stickerId) => ({ stickerId, gold: false })),
    ...(first ? Array.from({ length: goldCount }, () => ({ stickerId: first, gold: true })) : []),
  ];
}

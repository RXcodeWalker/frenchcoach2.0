import { describe, expect, it } from 'vitest';
import { JUNIOR_THEMES } from '../../../data/junior';
import { earnedStickers } from '../earned';
import { nextReward } from '../rewards';

const theme = JUNIOR_THEMES.find((t) => t.id === 'moi')!;
const ids = theme.stickers.map((s) => s.id);

describe('earnedStickers', () => {
  it('a new account has earned nothing, so the first mission earns the first sticker', () => {
    const earned = earnedStickers(theme, { stickers: {}, missionsDone: {} });
    expect(earned).toEqual([]);
    expect(nextReward(theme, earned)).toMatchObject({ sticker: theme.stickers[0], gold: false, unlock: null });
  });

  it('walks the set in order and the last one of the set brings the unlock', () => {
    const state = { stickers: { moi: ids.slice(0, ids.length - 1) }, missionsDone: { moi: ids.length - 1 } };
    const r = nextReward(theme, earnedStickers(theme, state));
    expect(r.sticker.id).toBe(ids[ids.length - 1]);
    expect(r.unlock).toEqual(theme.unlock);
  });

  it('missions finished beyond the set were gold, so each further replay earns the next gold one', () => {
    const complete = { stickers: { moi: ids }, missionsDone: { moi: ids.length } };
    expect(nextReward(theme, earnedStickers(theme, complete))).toMatchObject({ sticker: theme.stickers[0], gold: true });
    const oneGold = { stickers: { moi: ids }, missionsDone: { moi: ids.length + 1 } };
    expect(nextReward(theme, earnedStickers(theme, oneGold))).toMatchObject({ sticker: theme.stickers[1], gold: true });
  });

  it('ignores sticker ids from other themes and never reads an outcome', () => {
    const r = earnedStickers(theme, { stickers: { moi: ['col-palette', ids[0]] }, missionsDone: { moi: 1 } });
    expect(r).toEqual([{ stickerId: ids[0], gold: false }]);
  });
});

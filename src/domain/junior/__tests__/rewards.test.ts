import { describe, expect, it } from 'vitest';
import { JUNIOR_BANK } from '../../../data/junior';
import { buildPostcard } from '../postcard';
import { nextReward, type EarnedSticker } from '../rewards';
import { answerQuestion, startQuestionTurn } from '../turnFlow';
import type { JuniorTurnResult, MatchOutcome } from '../types';

const theme = JUNIOR_BANK.themes.find((t) => t.id === 'moi')!;
const n = theme.stickers.length;

/** Finishes `count` missions in a row, collecting what each earned. */
function finishMissions(count: number, start: EarnedSticker[] = []) {
  const earned = [...start];
  const rewards = [];
  for (let i = 0; i < count; i++) {
    const r = nextReward(theme, earned);
    rewards.push(r);
    earned.push({ stickerId: r.sticker.id, gold: r.gold });
  }
  return { earned, rewards };
}

/** Plays a whole mission's question turns through turnFlow with one fixed outcome per attempt. */
function playMission(outcome: MatchOutcome): JuniorTurnResult[] {
  return ['q1', 'q2', 'q3', 'q4', 'q5'].map((questionId) => {
    let state = startQuestionTurn();
    for (let i = 0; i < 3 && state.phase !== 'done'; i++) {
      state = answerQuestion(state, { outcome, frames: [], heard: [] }).state;
    }
    return {
      questionId,
      outcome: state.outcome!,
      frames: [{ patternId: 'j-aime-le-X', step: 'frame', sentence: "J'aime le bleu." }],
      heard: [],
      recordingId: null,
    };
  });
}

describe('nextReward (junior-track §10)', () => {
  it('a sticker rewards finishing, never accuracy: all-"none" and all-"got it" missions earn the same sticker', () => {
    const allNone = playMission('none');
    const allGot = playMission('got');
    expect(allNone.every((t) => t.outcome === 'none')).toBe(true);
    expect(allGot.every((t) => t.outcome === 'got')).toBe(true);

    for (const earned of [[], finishMissions(3).earned, finishMissions(n).earned, finishMissions(n + 2).earned]) {
      // The reward is computed the same way whatever the mission's outcomes were.
      const afterNone = nextReward(theme, earned);
      const afterGot = nextReward(theme, earned);
      expect(afterNone).toEqual(afterGot);
      // …and the Postcards show the same sticker.
      const pNone = buildPostcard(allNone, afterNone);
      const pGot = buildPostcard(allGot, afterGot);
      expect(pNone.items[2]).toEqual(pGot.items[2]);
    }
  });

  it('takes no outcomes by construction (theme + earned stickers only)', () => {
    expect(nextReward.length).toBe(2);
    // @ts-expect-error — there is no parameter for outcomes or turn results.
    nextReward(theme, [], playMission('got'));
  });

  it('earns the theme\'s stickers in set order, one per finished mission', () => {
    const { rewards } = finishMissions(n);
    expect(rewards.map((r) => r.sticker.id)).toEqual(theme.stickers.map((s) => s.id));
    expect(rewards.every((r) => !r.gold)).toBe(true);
  });

  it('the mission that completes the set gives the unlock, once', () => {
    const { rewards } = finishMissions(n + 3);
    expect(rewards.map((r) => r.unlock)).toEqual([...Array(n - 1).fill(null), theme.unlock, null, null, null]);
  });

  it('after the set, replays earn gold versions in set order, then repeat', () => {
    const { rewards } = finishMissions(3 * n);
    const gold = rewards.slice(n);
    expect(gold.every((r) => r.gold)).toBe(true);
    expect(gold.slice(0, n).map((r) => r.sticker.id)).toEqual(theme.stickers.map((s) => s.id));
    expect(gold.slice(n).map((r) => r.sticker.id)).toEqual(theme.stickers.map((s) => s.id));
  });

  it('ignores stickers from other themes and fills gaps in order', () => {
    const r = nextReward(theme, [
      { stickerId: 'col-palette', gold: false },
      { stickerId: theme.stickers[1].id, gold: false },
    ]);
    expect(r).toEqual({ sticker: theme.stickers[0], gold: false, unlock: null });
  });
});

import { describe, expect, it } from 'vitest';
import { STORY_CARDS, hasEnglishInstructions } from '../../../data/storyCards';
import { cardProgress, drillSessionId, parseDrillSessionId, pickNextCard } from '../drillProgress';

const [first, second] = STORY_CARDS;

describe('drill session ids', () => {
  it('round-trips the card id and step, including ids with underscores', () => {
    const id = drillSessionId('rp_tourism_01', 3, 1_700_000_000_000);
    expect(id).toBe('story-rp_tourism_01-1700000000000-3');
    expect(parseDrillSessionId(id)).toEqual({ cardId: 'rp_tourism_01', step: 3 });
  });

  it('ignores Story Mode ids written before the drill (no card id) and other modes', () => {
    expect(parseDrillSessionId('story-1700000000000-2')).toBeNull();
    expect(parseDrillSessionId('learn-abc')).toBeNull();
  });
});

describe('cardProgress', () => {
  it('counts distinct exchanges and marks a card done only when every one is answered', () => {
    const ids = [
      drillSessionId(first.id, 0, 1),
      drillSessionId(first.id, 0, 2), // a second take of the same exchange
      drillSessionId(first.id, 1, 3),
      ...second.tasks.map((_, i) => drillSessionId(second.id, i, 10 + i)),
      drillSessionId('not_a_card', 0, 4),
      drillSessionId(first.id, 99, 5), // out of range
    ];
    const progress = cardProgress(STORY_CARDS, ids);
    expect(progress.get(first.id)).toEqual({ answered: 2, total: first.tasks.length, done: false });
    expect(progress.get(second.id)?.done).toBe(true);
    expect(progress.has('not_a_card')).toBe(false);
  });
});

describe('pickNextCard', () => {
  it('prefers a card not yet done and never repeats the excluded one when there is a choice', () => {
    const allButFirst = STORY_CARDS.slice(1).flatMap((c) => c.tasks.map((_, i) => drillSessionId(c.id, i, i)));
    const progress = cardProgress(STORY_CARDS, allButFirst);
    expect(pickNextCard(STORY_CARDS, progress, null, () => 0.99)?.id).toBe(first.id);
    // Only the excluded card is left undone: fall back to it rather than nothing.
    expect(pickNextCard(STORY_CARDS, progress, first.id)?.id).toBe(first.id);
  });

  it('picks from every card once all are done, minus the excluded one', () => {
    const all = STORY_CARDS.flatMap((c) => c.tasks.map((_, i) => drillSessionId(c.id, i, i)));
    const progress = cardProgress(STORY_CARDS, all);
    for (const r of [0, 0.5, 0.999]) {
      expect(pickNextCard(STORY_CARDS, progress, first.id, () => r)?.id).not.toBe(first.id);
    }
  });
});

describe('the drill card bank', () => {
  it('has a title and five exchanges on every card, and both groups are non-empty', () => {
    for (const card of STORY_CARDS) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.title).not.toBe(card.scenario);
      expect(card.tasks.length).toBe(5);
    }
    expect(STORY_CARDS.some(hasEnglishInstructions)).toBe(true);
    expect(STORY_CARDS.some((c) => !hasEnglishInstructions(c))).toBe(true);
  });
});

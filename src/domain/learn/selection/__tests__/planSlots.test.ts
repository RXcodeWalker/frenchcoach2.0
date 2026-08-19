import { describe, it, expect } from 'vitest';
import { planSlots } from '../planSlots';
import type { SessionBlend } from '../../../../types/coach';

const BLEND: SessionBlend = {
  warmupPct: 20,
  reviewPct: 30,
  targetSkillPct: 30,
  stretchPct: 10,
  choicePct: 10,
  focusSkillIds: [],
};

function countByType(slots: ReturnType<typeof planSlots>) {
  return slots.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1;
    return acc;
  }, {});
}

describe('planSlots', () => {
  it('single question (count=1) gets exactly one target slot regardless of blend', () => {
    const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count: 1 });
    expect(slots).toEqual([{ type: 'target', band: { lo: 4.5, hi: 5.5 } }]);
  });

  it('review slot band is always null (ignored, filled from the review pool)', () => {
    const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count: 10 });
    for (const s of slots) {
      if (s.type === 'review') expect(s.band).toBeNull();
    }
  });

  it('allocates counts summing exactly to the requested count (largest-remainder determinism)', () => {
    for (const count of [2, 3, 5, 7, 10, 20]) {
      const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count });
      expect(slots).toHaveLength(count);
    }
  });

  it('standard 10-question session with a 10% stretchPct already yields >=1 stretch slot', () => {
    const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count: 10 });
    const counts = countByType(slots);
    expect(counts.stretch).toBeGreaterThanOrEqual(1);
  });

  it('stretch-plan rule: a >=5-question session with 0%-stretch blend still plans one stretch slot', () => {
    const noStretchBlend: SessionBlend = { ...BLEND, stretchPct: 0, choicePct: 20 };
    const slots = planSlots({ sessionBlend: noStretchBlend, sessionTarget: 5, count: 5 });
    const counts = countByType(slots);
    expect(counts.stretch).toBe(1);
    expect(slots).toHaveLength(5);
  });

  it('stretch-plan rule does not apply below 5 questions', () => {
    const noStretchBlend: SessionBlend = { ...BLEND, stretchPct: 0, choicePct: 20, warmupPct: 30, targetSkillPct: 50, reviewPct: 0 };
    const slots = planSlots({ sessionBlend: noStretchBlend, sessionTarget: 5, count: 4 });
    const counts = countByType(slots);
    expect(counts.stretch ?? 0).toBe(0);
  });

  it('bands are computed relative to sessionTarget per §8.1', () => {
    const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 6, count: 10 });
    const warmup = slots.find((s) => s.type === 'warmup')!;
    const target = slots.find((s) => s.type === 'target')!;
    const stretch = slots.find((s) => s.type === 'stretch')!;
    const choice = slots.find((s) => s.type === 'choice')!;
    expect(warmup.band).toEqual({ lo: 3.5, hi: 5.0 });
    expect(target.band).toEqual({ lo: 5.5, hi: 6.5 });
    expect(stretch.band).toEqual({ lo: 6.75, hi: 8.0 });
    expect(choice.band).toEqual({ lo: 4.5, hi: 7.5 });
  });

  it('is deterministic: same inputs produce identical output', () => {
    const a = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count: 20 });
    const b = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count: 20 });
    expect(a).toEqual(b);
  });

  it('fill order in the returned array is warmup, review, target, stretch, choice', () => {
    const slots = planSlots({ sessionBlend: BLEND, sessionTarget: 5, count: 20 });
    const order = ['warmup', 'review', 'target', 'stretch', 'choice'];
    let lastIdx = -1;
    for (const s of slots) {
      const idx = order.indexOf(s.type);
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });
});

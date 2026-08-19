// ── planSlots — docs §8.1. Pure: SessionBlend + sessionTarget + count -> SessionSlot[]. ─

import type { SessionBlend } from '../../../types/coach';
import type { DemandBand, PlanSlotsArgs, SessionSlot, SlotType } from './types';

/** docs §8.1 — band offsets relative to sessionTarget (T). `review`'s band is ignored. */
export function bandFor(type: SlotType, sessionTarget: number): DemandBand | null {
  switch (type) {
    case 'warmup':
      return { lo: sessionTarget - 2.5, hi: sessionTarget - 1.0 };
    case 'review':
      return null;
    case 'target':
      return { lo: sessionTarget - 0.5, hi: sessionTarget + 0.5 };
    case 'stretch':
      return { lo: sessionTarget + 0.75, hi: sessionTarget + 2.0 };
    case 'choice':
      return { lo: sessionTarget - 1.5, hi: sessionTarget + 1.5 };
  }
}

const BLEND_KEY_TO_SLOT: { key: keyof SessionBlend; type: SlotType }[] = [
  { key: 'warmupPct', type: 'warmup' },
  { key: 'reviewPct', type: 'review' },
  { key: 'targetSkillPct', type: 'target' },
  { key: 'stretchPct', type: 'stretch' },
  { key: 'choicePct', type: 'choice' },
];

/**
 * Largest-remainder rounding of `count` across the blend's five percentages,
 * so the total always sums to exactly `count` (docs §8.1 "determinism").
 */
function allocateCounts(sessionBlend: SessionBlend, count: number): Record<SlotType, number> {
  const totalPct = BLEND_KEY_TO_SLOT.reduce((sum, { key }) => sum + (sessionBlend[key] as number), 0) || 1;

  const raw = BLEND_KEY_TO_SLOT.map(({ key, type }) => {
    const share = ((sessionBlend[key] as number) / totalPct) * count;
    return { type, floor: Math.floor(share), remainder: share - Math.floor(share) };
  });

  const allocated: Record<SlotType, number> = { warmup: 0, review: 0, target: 0, stretch: 0, choice: 0 };
  let assigned = 0;
  for (const r of raw) {
    allocated[r.type] = r.floor;
    assigned += r.floor;
  }

  let remaining = count - assigned;
  // Largest remainder first; tie-break by fixed slot order (BLEND_KEY_TO_SLOT
  // order) so the allocation is deterministic for equal remainders.
  const byRemainder = [...raw].sort((a, b) => b.remainder - a.remainder);
  for (const r of byRemainder) {
    if (remaining <= 0) break;
    allocated[r.type] += 1;
    remaining -= 1;
  }

  return allocated;
}

/**
 * docs §8.1. `single` (count === 1) gets a single `target` slot — callers
 * handle `full_topic` themselves (it has no UI entry point and stays on the
 * legacy path per docs §8.1).
 */
export function planSlots({ sessionBlend, sessionTarget, count }: PlanSlotsArgs): SessionSlot[] {
  if (count <= 1) {
    return [{ type: 'target', band: bandFor('target', sessionTarget) }];
  }

  const counts = allocateCounts(sessionBlend, count);

  // Stretch-plan rule: sessions of >=5 questions plan at least one stretch
  // slot, taken from whichever non-stretch slot has the most spare count
  // (deterministic: fixed priority order, ties broken by that order).
  if (count >= 5 && counts.stretch === 0) {
    const donorPriority: SlotType[] = ['choice', 'target', 'warmup', 'review'];
    const donor = donorPriority.find((type) => counts[type] > 0);
    if (donor) {
      counts[donor] -= 1;
      counts.stretch += 1;
    }
  }

  const order: SlotType[] = ['warmup', 'review', 'target', 'stretch', 'choice'];
  const slots: SessionSlot[] = [];
  for (const type of order) {
    for (let i = 0; i < counts[type]; i++) {
      slots.push({ type, band: bandFor(type, sessionTarget) });
    }
  }
  return slots;
}

/**
 * The typing schedule behind the teacher's conversation (Learn feedback
 * Batch 6b). Pure: given how much text each line types, it says what is on
 * screen at a given moment, so the hook is a thin timer around it.
 *
 *  - Only the teacher's English talk is typed. A « quoted » span is one unit
 *    and appears whole — a quote or correction is never revealed letter by
 *    letter. Lines that are not typed (the learner's bubble, fix rows, cards)
 *    have zero units and appear whole.
 *  - Speed adapts so the whole conversation finishes in about TOTAL_CAP_MS
 *    however long the feedback is; a short one types at a natural pace.
 */

/** The whole conversation is on screen by about this long, however much there is. */
export const TOTAL_CAP_MS = 5_000;
/** Slowest typing pace, units per second — short feedback never crawls to fill the cap. */
export const MIN_UNITS_PER_SECOND = 45;
const PAUSE_MS = 220;
const MAX_TOTAL_PAUSE_MS = 1_500;

/**
 * Typing units for a talk line: every character is a unit, except that a
 * « … » span (guillemets and what is between them) is a single unit.
 */
export function typingUnits(text: string): string[] {
  const units: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '«') {
      const close = text.indexOf('»', i + 1);
      if (close !== -1) {
        units.push(text.slice(i, close + 1));
        i = close + 1;
        continue;
      }
    }
    // A code point, so an emoji or astral character is never split.
    const cp = String.fromCodePoint(text.codePointAt(i)!);
    units.push(cp);
    i += cp.length;
  }
  return units;
}

/** The first `count` units of `text`, as a string. */
export function typedPrefix(text: string, count: number): string {
  return typingUnits(text).slice(0, Math.max(0, count)).join('');
}

export interface RevealPlan {
  /** Per line: the units it types (0 = appears whole). */
  unitCounts: number[];
  unitsPerSecond: number;
  pauseMs: number;
  /** When each line starts appearing. */
  startsAt: number[];
  /** When each line finishes appearing. */
  endsAt: number[];
  totalMs: number;
}

export function planReveal(unitCounts: readonly number[]): RevealPlan {
  const typed = unitCounts.reduce((a, b) => a + b, 0);
  const gaps = Math.max(0, unitCounts.length - 1);
  const pauseMs = gaps === 0 ? 0 : Math.min(PAUSE_MS, Math.floor(MAX_TOTAL_PAUSE_MS / gaps));
  const typingBudgetMs = Math.max(1_000, TOTAL_CAP_MS - gaps * pauseMs);
  const unitsPerSecond = Math.max(MIN_UNITS_PER_SECOND, typed / (typingBudgetMs / 1000));

  const startsAt: number[] = [];
  const endsAt: number[] = [];
  let t = 0;
  unitCounts.forEach((units, i) => {
    const start = i === 0 ? 0 : t + pauseMs;
    const end = start + (units / unitsPerSecond) * 1000;
    startsAt.push(start);
    endsAt.push(end);
    t = end;
  });
  return { unitCounts: [...unitCounts], unitsPerSecond, pauseMs, startsAt, endsAt, totalMs: t };
}

export interface RevealState {
  /** Lines [0, visible) have started appearing; the last of them may still be typing. */
  visible: number;
  /** Units of line `visible - 1` typed so far (its full count once finished). */
  units: number;
  done: boolean;
}

export function revealAt(plan: RevealPlan, elapsedMs: number): RevealState {
  const n = plan.unitCounts.length;
  if (n === 0 || elapsedMs >= plan.totalMs) return { visible: n, units: n === 0 ? 0 : plan.unitCounts[n - 1], done: true };
  let visible = 0;
  while (visible < n && plan.startsAt[visible] <= elapsedMs) visible++;
  if (visible === 0) return { visible: 0, units: 0, done: false };
  const i = visible - 1;
  const units = Math.min(
    plan.unitCounts[i],
    Math.floor(((elapsedMs - plan.startsAt[i]) / 1000) * plan.unitsPerSecond),
  );
  return { visible, units, done: false };
}

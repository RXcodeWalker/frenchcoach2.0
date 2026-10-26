import type { Transition, Variants } from 'framer-motion';

/**
 * The eight named motions of Design System v2 — the only motion the app uses.
 *
 *   enter      cards fade and rise 12px (.98→1), 420ms spring, staggered 50ms
 *   slide      nav pills, segmented indicators, toggle knobs, chevrons — 320ms slide easing
 *   press      scale(.97) on :active, 80ms
 *   fill       bars, rings and number count-ups — 700ms ease-out
 *   celebrate  after a session: the XP pill counts up — 900ms
 *   streak     the streak number rolls and the flame wiggles
 *   record     the live waveform while recording
 *   correct    strike-through, then the fix drops in
 *
 * Hover is never a motion: background or border colour only, 120ms
 * (`transition-colors duration-state`). Under reduced motion every motion
 * collapses to a 200ms fade or to its end state — use `useReducedMotion()`
 * with the `reduced*` helpers below.
 */

// ── easing + duration tokens (mirror index.css :root) ─────────────────────────
export const EASE = [0.2, 0, 0.2, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;
export const EASE_SLIDE = [0.34, 1.35, 0.64, 1] as const;

export const DUR = {
  state: 0.12,
  press: 0.08,
  enter: 0.42,
  slide: 0.32,
  fill: 0.7,
  celebrate: 0.9,
  reduced: 0.2,
} as const;

// ── 1. enter ──────────────────────────────────────────────────────────────────
/** A single card. Parent containers use `stagger` so children enter 50ms apart. */
export const enter: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.enter, ease: EASE_SPRING } },
};

/** Reduced-motion form of `enter`: a 200ms fade, nothing moves. */
export const enterReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.reduced, ease: 'linear' } },
};

/** Container for `enter` children: no motion of its own, 50ms stagger. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Route wrapper: a plain fade so the cards inside carry the rise. */
export const route: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.enter, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DUR.state, ease: EASE } },
};

/** @deprecated name kept for existing call sites — it is the `enter` motion. */
export const fadeUp = enter;

// ── 2. slide ──────────────────────────────────────────────────────────────────
/** For layout-animated indicators (`layoutId`) and knob/chevron transforms. */
export const slide: Transition = { duration: DUR.slide, ease: EASE_SLIDE };

// ── 3. press ──────────────────────────────────────────────────────────────────
/** framer-motion `whileTap` for a control; CSS controls use `active:scale-[.97]`. */
export const press = { scale: 0.97, transition: { duration: DUR.press } } as const;

// ── 4. fill ───────────────────────────────────────────────────────────────────
/** Bars, rings and count-ups. Pass `delay` for choreography (container → content → number). */
export const fill = (delay = 0.22): Transition => ({ duration: DUR.fill, ease: EASE_OUT, delay });

// ── 5. celebrate ──────────────────────────────────────────────────────────────
/** The XP pill / reward chip popping in after a session. */
export const celebrate: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.52, ease: EASE_SPRING, delay: 0.7 } },
};

// ── 6. streak ─────────────────────────────────────────────────────────────────
/** The flame wiggle; pair with `streakRoll` on the number. */
export const streakFlame = {
  scale: [1, 1.25, 1.1, 1],
  rotate: [0, -8, 6, 0],
  transition: { duration: 0.6, times: [0, 0.35, 0.65, 1], ease: 'easeOut', delay: 0.48 },
} as const;

/** Rolls a two-line number stack up by one line (20px). */
export const streakRoll: Transition = { duration: 0.52, ease: EASE_SPRING, delay: 0.58 };

// ── 7. record ─────────────────────────────────────────────────────────────────
/** Waveform bars follow the live level; this is how fast a bar settles back. */
export const recordSettle: Transition = { duration: 0.22, ease: EASE };

// ── 8. correct ────────────────────────────────────────────────────────────────
/** Strike through the wrong form, then drop the fix in, then underline it. */
export const correct = {
  strike: (d = 0.38): Transition => ({ duration: 0.24, ease: EASE, delay: d }),
  fix: (d = 0.38): Transition => ({ duration: 0.44, ease: EASE_SPRING, delay: d + 0.28 }),
  underline: (d = 0.38): Transition => ({ duration: 0.26, ease: EASE, delay: d + 0.6 }),
};

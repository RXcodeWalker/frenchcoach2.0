/**
 * The physics behind `Burst` (the one-shot celebration used on exactly two
 * arrival moments: "You're all set" after the goal survey, and a returning
 * learner's welcome-back). Pure — no DOM, no canvas, no clock — so the motion
 * is unit-tested and a render can't drift from it.
 *
 * A burst is a short fan of small, soft pieces: thin strips, rounded flecks and
 * dots in the app's own role colours, launched in an arc, slowed by drag so
 * they float rather than fall, flipping as they go and fading out. It runs once
 * and ends (`BURST_SECONDS`); it never loops. Under reduced motion `Burst`
 * renders nothing at all.
 */

export type BurstShape = 'strip' | 'fleck' | 'dot';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation, radians. */
  rot: number;
  /** Rotation speed, radians per second. */
  vrot: number;
  /** Width and height before flipping, px. */
  w: number;
  h: number;
  shape: BurstShape;
  /** Index into the colour list. */
  color: number;
  /** Phase of the flip (a piece turning over, as paper does), radians. */
  flip: number;
  flipSpeed: number;
  /** Sideways sway while falling, px per second. */
  sway: number;
  /** Seconds lived so far, and how long this piece lives in total. */
  age: number;
  ttl: number;
}

/** A launch point: `x`/`y` are fractions of the viewport, `angle` is degrees (0 = right, 90 = up). */
export interface Cannon {
  x: number;
  y: number;
  angle: number;
  /** Total fan width in degrees. */
  spread: number;
  /** Random sideways offset of the launch point, as a fraction of the viewport width (a shower spans the screen). */
  xJitter?: number;
}

export type BurstPreset = 'cannons' | 'shower';

/** Two fans from the lower corners, crossing over the middle — the "all set" reveal. */
const CANNONS: readonly Cannon[] = [
  { x: 0.04, y: 0.78, angle: 62, spread: 38 },
  { x: 0.96, y: 0.78, angle: 118, spread: 38 },
];

/** A soft shower from the top edge — the quieter welcome-back. */
const SHOWER: readonly Cannon[] = [
  { x: 0.5, y: -0.02, angle: 270, spread: 150, xJitter: 0.44 },
];

export const PRESETS: Record<BurstPreset, readonly Cannon[]> = { cannons: CANNONS, shower: SHOWER };

/** Pieces per cannon at a desktop width; a phone gets fewer, so it never feels crowded. */
const PER_CANNON: Record<BurstPreset, number> = { cannons: 46, shower: 54 };

/** Seconds the longest-lived piece lasts: the whole effect is over by then. */
export const BURST_SECONDS = 2.6;
const FADE_SECONDS = 0.7;
const GRAVITY = 900;
/** Drag, per second: a piece reaches a gentle terminal speed (GRAVITY / DRAG ≈ 360 px/s). */
const DRAG = 2.5;

/** The role tokens the pieces are painted with, in order. `Burst` reads them from the page's CSS. */
export const BURST_TOKENS = ['--action', '--reward', '--progress', '--streak', '--info-text'] as const;

/** Copies of the light-theme role tokens, used only if a token can't be read (never in a browser). */
export const BURST_FALLBACK_COLORS: readonly string[] = ['#7C3AED', '#C27C0E', '#12805A', '#D4561C', '#0E6683'];

export type Rng = () => number;

/** A small deterministic generator (mulberry32) for tests; the component uses Math.random. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng: Rng, lo: number, hi: number) => lo + (hi - lo) * rng();

/** How many pieces to launch for a viewport, so a phone is lighter than a desktop. */
export function pieceCount(preset: BurstPreset, width: number): number {
  const scale = width < 480 ? 0.6 : width < 900 ? 0.8 : 1;
  return Math.round(PER_CANNON[preset] * PRESETS[preset].length * scale);
}

export function createBurst(
  width: number,
  height: number,
  preset: BurstPreset,
  rng: Rng,
  colorCount: number = BURST_TOKENS.length,
): Particle[] {
  const cannons = PRESETS[preset];
  const total = pieceCount(preset, width);
  // The throw is proportional to the screen, so a tall phone and a wide desktop both fill out.
  const reach = Math.min(Math.max(height, 480), 1000);
  const out: Particle[] = [];

  for (let i = 0; i < total; i++) {
    const c = cannons[i % cannons.length];
    const angle = ((c.angle + between(rng, -c.spread / 2, c.spread / 2)) * Math.PI) / 180;
    // Cannons throw hard and let drag slow them; a shower is only nudged.
    const speed = preset === 'cannons' ? reach * between(rng, 0.85, 1.55) : between(rng, 40, 190);
    const shapeRoll = rng();
    const shape: BurstShape = shapeRoll < 0.5 ? 'strip' : shapeRoll < 0.82 ? 'fleck' : 'dot';
    const size = between(rng, 6, 11);
    out.push({
      x: (c.x + between(rng, -(c.xJitter ?? 0), c.xJitter ?? 0)) * width + between(rng, -6, 6),
      y: c.y * height + between(rng, -6, 6),
      vx: Math.cos(angle) * speed,
      // Screen y grows downward, so "up" is negative.
      vy: -Math.sin(angle) * speed,
      rot: between(rng, 0, Math.PI * 2),
      vrot: between(rng, -5, 5),
      w: shape === 'strip' ? size * 0.42 : size,
      h: shape === 'strip' ? size * 1.9 : shape === 'dot' ? size : size * 0.7,
      shape,
      color: Math.floor(rng() * colorCount) % Math.max(colorCount, 1),
      flip: between(rng, 0, Math.PI * 2),
      flipSpeed: between(rng, 5, 11),
      sway: between(rng, -26, 26),
      age: preset === 'shower' ? -between(rng, 0, 0.7) : 0, // a shower staggers its start
      ttl: between(rng, BURST_SECONDS - 0.9, BURST_SECONDS),
    });
  }
  return out;
}

/** Advance one piece by `dt` seconds (clamped, so a stalled tab doesn't teleport pieces). */
export function stepParticle(p: Particle, dt: number): void {
  const step = Math.min(Math.max(dt, 0), 1 / 20);
  p.age += step;
  if (p.age < 0) return; // not launched yet
  const damp = Math.exp(-DRAG * step);
  p.vx *= damp;
  p.vy = p.vy * damp + GRAVITY * step;
  p.x += (p.vx + Math.sin(p.flip) * p.sway) * step;
  p.y += p.vy * step;
  p.rot += p.vrot * step;
  p.flip += p.flipSpeed * step;
}

/** 1 until the last `FADE_SECONDS` of a piece's life, then down to 0. */
export function particleAlpha(p: Particle): number {
  if (p.age < 0) return 0;
  const left = p.ttl - p.age;
  if (left <= 0) return 0;
  return left >= FADE_SECONDS ? 1 : left / FADE_SECONDS;
}

export function burstDone(particles: readonly Particle[]): boolean {
  return particles.every(p => p.age >= p.ttl);
}

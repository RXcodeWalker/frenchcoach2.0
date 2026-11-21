import { describe, expect, it } from 'vitest';
import {
  BURST_SECONDS,
  BURST_TOKENS,
  burstDone,
  createBurst,
  particleAlpha,
  pieceCount,
  seededRng,
  stepParticle,
} from '../burstPhysics';

const W = 1000;
const H = 800;

function run(particles: ReturnType<typeof createBurst>, seconds: number) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) particles.forEach(p => stepParticle(p, dt));
}

describe('burst physics', () => {
  it('is deterministic for a seed', () => {
    const a = createBurst(W, H, 'cannons', seededRng(7));
    const b = createBurst(W, H, 'cannons', seededRng(7));
    expect(a).toEqual(b);
  });

  it('launches fewer pieces on a phone than on a desktop', () => {
    expect(pieceCount('cannons', 390)).toBeLessThan(pieceCount('cannons', 1200));
    expect(createBurst(390, 800, 'cannons', seededRng(1))).toHaveLength(pieceCount('cannons', 390));
  });

  it('only uses colours that exist', () => {
    const colors = createBurst(W, H, 'cannons', seededRng(3), BURST_TOKENS.length).map(p => p.color);
    expect(Math.min(...colors)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...colors)).toBeLessThan(BURST_TOKENS.length);
  });

  it('cannons throw pieces up and inward from the lower corners', () => {
    const ps = createBurst(W, H, 'cannons', seededRng(11));
    expect(ps.every(p => p.vy < 0)).toBe(true); // up is negative y
    const left = ps.filter(p => p.x < W / 2);
    const right = ps.filter(p => p.x >= W / 2);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(left.every(p => p.vx > 0)).toBe(true);
    expect(right.every(p => p.vx < 0)).toBe(true);
  });

  it('a shower starts above the screen, staggered, and only falls', () => {
    const ps = createBurst(W, H, 'shower', seededRng(5));
    expect(ps.every(p => p.y < 0)).toBe(true);
    expect(ps.some(p => p.age < 0)).toBe(true);
    run(ps, 1.2);
    expect(ps.every(p => p.vy > 0 || p.age < 0)).toBe(true);
  });

  it('never loops: every piece is gone by the end of BURST_SECONDS', () => {
    for (const preset of ['cannons', 'shower'] as const) {
      const ps = createBurst(W, H, preset, seededRng(2));
      expect(burstDone(ps)).toBe(false);
      run(ps, BURST_SECONDS + 1); // + the shower's staggered start
      expect(burstDone(ps)).toBe(true);
      expect(ps.every(p => particleAlpha(p) === 0)).toBe(true);
    }
  });

  it('fades out at the end of a piece\'s life and is invisible before launch', () => {
    const [p] = createBurst(W, H, 'cannons', seededRng(9));
    p.age = 0;
    expect(particleAlpha(p)).toBe(1);
    p.age = p.ttl - 0.2;
    expect(particleAlpha(p)).toBeGreaterThan(0);
    expect(particleAlpha(p)).toBeLessThan(1);
    p.age = -0.1;
    expect(particleAlpha(p)).toBe(0);
  });

  it('a stalled frame cannot teleport a piece', () => {
    const [p] = createBurst(W, H, 'cannons', seededRng(4));
    const before = { x: p.x, y: p.y };
    stepParticle(p, 30); // a tab that was asleep for 30 s
    expect(Math.hypot(p.x - before.x, p.y - before.y)).toBeLessThan(200);
  });

  it('drag keeps pieces floating: the fall speed settles instead of growing', () => {
    const [p] = createBurst(W, H, 'shower', seededRng(6));
    p.age = 0;
    run([p], 2);
    expect(p.vy).toBeLessThan(500);
  });
});

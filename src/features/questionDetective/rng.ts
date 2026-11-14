/** Seeded 0–1 generator so a round can be replayed in a test. */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(rand: () => number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.floor(rand() * length));
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pickIndex(rand, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

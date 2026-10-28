/**
 * Pronunciation Lab — the monthly-check benchmark sentences (pronunciation-lab
 * plan §3.3 "Monthly check", §3.4). Pure, static, authored.
 *
 * The same five sentences every month are the only honest progress line:
 * comparing "words clear" across different sentences mostly measures how hard
 * the sentences were. So the list is frozen — a change to any sentence is a
 * version bump (`BENCHMARK_VERSION`) plus the hash below, and a check taken
 * under another version is never compared with a check taken under this one
 * (`monthlyCheck.ts`).
 *
 * Together they cover every scored sound family (`__tests__/benchmark.test.ts`
 * fails otherwise). They are written with straight apostrophes, as Learn's bank
 * is, and are recorded by "Record voices" like any model answer
 * (`collectLines.ts`), so ▶ Listen finds a recording.
 */

export const BENCHMARK_SENTENCES: readonly string[] = [
  "Mes parents et moi, nous aimons la montagne.",
  "Le matin, tout le monde mange du pain avec du beurre.",
  "Il fait très chaud, mais mon petit chien est content.",
  "Pendant les vacances, je voyage avec ma famille.",
  "Je veux bien venir, mais j'ai peur de la route.",
];

/** Bump with any change to BENCHMARK_SENTENCES (and update the hash). */
export const BENCHMARK_VERSION = 'lab-benchmark-v1';

/** sha256(JSON.stringify(BENCHMARK_SENTENCES)), pinned by `__tests__/benchmark.test.ts`. */
export const BENCHMARK_HASH = 'a5962423a281dfcd8d28675a47af25c4ab8550af6e11247b306ad6ce9c9d6c7c';

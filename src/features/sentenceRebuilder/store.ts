import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import { MASTERED_AT } from './engine';
import { LEVELS, MODES, type Level, type Mode, type Setup } from './types';

/**
 * The Sentence Rebuilder's only persistence: a best per mode and level, the
 * setup used last, and how many times each sentence has been solved cleanly
 * (two clean solves in different rounds = mastered). Local to this device and
 * account, never synced, never an XP or Session write.
 */

export interface Best {
  score: number;
  solved: number;
  bestCombo: number;
}

interface Stored {
  version: 1;
  bests: Record<string, Best>;
  last: Setup | null;
  /** Clean first-time solves per sentence id. */
  clean: Record<string, number>;
}

const EMPTY: Stored = { version: 1, bests: {}, last: null, clean: {} };

export const bestKey = (mode: Mode, level: Level): string => `${mode}:${level}`;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isBest(v: unknown): v is Best {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return isNum(b.score) && isNum(b.solved) && isNum(b.bestCombo);
}

function read(): Stored {
  const raw = storageGet<unknown>(STORAGE_KEYS.sentenceRebuilder, EMPTY);
  if (!raw || typeof raw !== 'object' || (raw as Stored).version !== 1) return EMPTY;
  const stored = raw as Stored;

  const bests: Record<string, Best> = {};
  for (const [k, v] of Object.entries(stored.bests ?? {})) if (isBest(v)) bests[k] = v;

  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(stored.clean ?? {})) if (isNum(v) && v > 0) clean[k] = Math.floor(v);

  const last = stored.last;
  const lastOk = !!last && MODES.includes(last.mode) && LEVELS.includes(last.level);
  return { version: 1, bests, last: lastOk ? last : null, clean };
}

const write = (next: Stored) => storageSet(STORAGE_KEYS.sentenceRebuilder, next);

export function getBest(mode: Mode, level: Level): Best | null {
  return read().bests[bestKey(mode, level)] ?? null;
}

export function getLastSetup(): Setup | null {
  return read().last;
}

export function saveLastSetup(last: Setup): void {
  write({ ...read(), last });
}

/** Stores the result if it beats the saved best. Returns whether it did. */
export function recordResult(mode: Mode, level: Level, result: Best): boolean {
  if (result.score <= 0) return false;
  const stored = read();
  const key = bestKey(mode, level);
  const previous = stored.bests[key];
  if (previous && previous.score >= result.score) return false;
  write({ ...stored, bests: { ...stored.bests, [key]: result } });
  return true;
}

/** Clean solves per sentence id. */
export function getCleanCounts(): Record<string, number> {
  return read().clean;
}

/** Adds one clean solve to each sentence (a sentence is counted once per round). */
export function recordClean(ids: readonly string[]): void {
  if (ids.length === 0) return;
  const stored = read();
  const clean = { ...stored.clean };
  for (const id of new Set(ids)) clean[id] = (clean[id] ?? 0) + 1;
  write({ ...stored, clean });
}

/** How many of the given sentence ids are mastered. */
export function masteredCount(ids: readonly string[], clean: Readonly<Record<string, number>>): number {
  return ids.filter(id => (clean[id] ?? 0) >= MASTERED_AT).length;
}

import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import { DICTEE_FORMATS, DICTEE_LEVELS, type DicteeFormat, type DicteeLevel } from '../../data/dictee';
import type { Focus, Setup } from './engine';

/**
 * Dictée's only persistence: personal bests per format and level, the setup
 * used last, the lines to practise again ("my slips") and the lines heard
 * lately (so a round isn't the last one again). Local to the device and
 * account, never synced, never an XP or Session write — a game for its own
 * sake. Holds line ids and numbers only: never what the learner typed.
 */

export interface Best {
  score: number;
  stars: 0 | 1 | 2 | 3;
  /** Whole percent. */
  accuracy: number;
}

interface WeakEntry {
  id: string;
  /** Perfect answers in a row since the last slip. */
  clean: number;
  /** When it was last missed — the oldest goes first when the list is full. */
  at: number;
}

interface Stored {
  version: 1;
  bests: Record<string, Best>;
  last: Setup | null;
  weak: WeakEntry[];
  recent: string[];
}

const EMPTY: Stored = { version: 1, bests: {}, last: null, weak: [], recent: [] };

/** A line leaves "my slips" after this many perfect answers in a row. */
export const CLEAN_TO_CLEAR = 2;
export const MAX_SLIPS = 60;
export const MAX_RECENT = 40;

export const bestKey = (format: DicteeFormat, level: DicteeLevel): string => `${format}:${level}`;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isBest(v: unknown): v is Best {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return isNum(b.score) && isNum(b.accuracy) && (b.stars === 0 || b.stars === 1 || b.stars === 2 || b.stars === 3);
}

function isSetup(v: unknown): v is Setup {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    DICTEE_FORMATS.includes(s.format as DicteeFormat) &&
    DICTEE_LEVELS.includes(s.level as DicteeLevel) &&
    (['any', 'sound-alikes', 'slips'] as Focus[]).includes(s.focus as Focus)
  );
}

function read(): Stored {
  const raw = storageGet<unknown>(STORAGE_KEYS.dictee, EMPTY);
  if (!raw || typeof raw !== 'object' || (raw as Stored).version !== 1) return EMPTY;
  const r = raw as Partial<Stored>;
  const bests: Record<string, Best> = {};
  for (const [k, v] of Object.entries(r.bests ?? {})) if (isBest(v)) bests[k] = v;
  const weak = (Array.isArray(r.weak) ? r.weak : []).filter(
    (w): w is WeakEntry => !!w && typeof w.id === 'string' && isNum(w.clean) && isNum(w.at),
  );
  const recent = (Array.isArray(r.recent) ? r.recent : []).filter((id): id is string => typeof id === 'string');
  return { version: 1, bests, last: isSetup(r.last) ? r.last : null, weak, recent };
}

const write = (next: Stored) => storageSet(STORAGE_KEYS.dictee, next);

export function getBest(format: DicteeFormat, level: DicteeLevel): Best | null {
  return read().bests[bestKey(format, level)] ?? null;
}

export function getLastSetup(): Setup | null {
  return read().last;
}

export function saveLastSetup(last: Setup): void {
  write({ ...read(), last });
}

/** The lines to practise again. */
export function getSlipIds(): Set<string> {
  return new Set(read().weak.map(w => w.id));
}

/** Lines heard lately, newest last. */
export function getRecentIds(): Set<string> {
  return new Set(read().recent);
}

export function noteRecent(ids: readonly string[]): void {
  const stored = read();
  const kept = stored.recent.filter(id => !ids.includes(id));
  write({ ...stored, recent: [...kept, ...ids].slice(-MAX_RECENT) });
}

/**
 * Keeps "my slips" honest: a miss adds the line (or restarts its clean run), a
 * perfect answer moves a listed line towards leaving, and two in a row clears it.
 */
export function recordAttempt(id: string, perfect: boolean, now = Date.now()): void {
  const stored = read();
  const existing = stored.weak.find(w => w.id === id);
  let weak = stored.weak.filter(w => w.id !== id);
  if (!perfect) {
    weak.push({ id, clean: 0, at: now });
  } else if (existing) {
    if (existing.clean + 1 < CLEAN_TO_CLEAR) weak.push({ ...existing, clean: existing.clean + 1 });
  } else {
    return;
  }
  if (weak.length > MAX_SLIPS) weak = [...weak].sort((a, b) => b.at - a.at).slice(0, MAX_SLIPS);
  write({ ...stored, weak });
}

/** Stores the round if it beats the saved best on this setting. Returns whether it did. */
export function recordBest(format: DicteeFormat, level: DicteeLevel, result: Best): boolean {
  if (result.score <= 0) return false;
  const stored = read();
  const key = bestKey(format, level);
  const previous = stored.bests[key];
  if (previous && previous.score >= result.score) return false;
  write({ ...stored, bests: { ...stored.bests, [key]: result } });
  return true;
}

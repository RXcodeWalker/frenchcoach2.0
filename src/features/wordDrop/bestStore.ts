import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import { DIRECTIONS, PACES, type Direction, type Pace } from './types';

/**
 * Word Drop's only persistence: the learner's best score per direction and
 * pace, and the setup they used last. Local to the device and account, never
 * synced, never an XP or Session write — a game for its own sake.
 */

export interface Best {
  score: number;
  wave: number;
  bestCombo: number;
  cleared: number;
}

export interface LastSetup {
  direction: Direction;
  pace: Pace;
  topic: string;
}

interface Stored {
  version: 1;
  bests: Record<string, Best>;
  last: LastSetup | null;
}

const EMPTY: Stored = { version: 1, bests: {}, last: null };

export const bestKey = (direction: Direction, pace: Pace): string => `${direction}:${pace}`;

function isBest(v: unknown): v is Best {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return ['score', 'wave', 'bestCombo', 'cleared'].every(k => typeof b[k] === 'number' && Number.isFinite(b[k] as number));
}

function read(): Stored {
  const raw = storageGet<unknown>(STORAGE_KEYS.wordDropBests, EMPTY);
  if (!raw || typeof raw !== 'object' || (raw as Stored).version !== 1) return EMPTY;
  const stored = raw as Stored;
  const bests: Record<string, Best> = {};
  for (const [k, v] of Object.entries(stored.bests ?? {})) if (isBest(v)) bests[k] = v;
  const last = stored.last;
  const lastOk =
    last && DIRECTIONS.includes(last.direction) && PACES.includes(last.pace) && typeof last.topic === 'string';
  return { version: 1, bests, last: lastOk ? last : null };
}

export function getBest(direction: Direction, pace: Pace): Best | null {
  return read().bests[bestKey(direction, pace)] ?? null;
}

export function getLastSetup(): LastSetup | null {
  return read().last;
}

export function saveLastSetup(last: LastSetup): void {
  const stored = read();
  storageSet(STORAGE_KEYS.wordDropBests, { ...stored, last });
}

/** Stores the result if it beats the saved best. Returns whether it did. */
export function recordResult(direction: Direction, pace: Pace, result: Best): boolean {
  if (result.score <= 0) return false;
  const stored = read();
  const key = bestKey(direction, pace);
  const previous = stored.bests[key];
  if (previous && previous.score >= result.score) return false;
  storageSet(STORAGE_KEYS.wordDropBests, { ...stored, bests: { ...stored.bests, [key]: result } });
  return true;
}

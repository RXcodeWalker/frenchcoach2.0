import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import type { FightId } from './bosses';
import type { BattleSummary, Stars } from './engine';

/**
 * The learner's personal record against each boss: stars, wins, best combo.
 * LOCAL ONLY and separate from app state on purpose — a fight earns no XP and
 * writes no Session, mastery or evidence, so nothing here goes through
 * AppContext (`noAppStateWrites.test.ts`). Stored as a versioned payload, like
 * Emoji Master's personal bests; a missing, damaged or newer-version value
 * reads as "no records yet".
 */
export interface BossRecord {
  fights: number;
  wins: number;
  /** Best stars from any fight; 0 until the first win. */
  stars: Stars;
  bestCombo: number;
  /** Fewest rounds in a win. */
  fastestWin: number | null;
  updatedAt: string;
}

export interface BossRecordsV1 {
  version: 1;
  bosses: Partial<Record<FightId, BossRecord>>;
}

const EMPTY: BossRecordsV1 = { version: 1, bosses: {} };

function isRecord(value: unknown): value is BossRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<BossRecord>;
  return (
    typeof r.fights === 'number' &&
    typeof r.wins === 'number' &&
    (r.stars === 0 || r.stars === 1 || r.stars === 2 || r.stars === 3) &&
    typeof r.bestCombo === 'number' &&
    (r.fastestWin === null || typeof r.fastestWin === 'number')
  );
}

export function readBossRecords(): BossRecordsV1 {
  const raw = storageGet<unknown>(STORAGE_KEYS.bossBattle, EMPTY);
  if (!raw || typeof raw !== 'object' || (raw as BossRecordsV1).version !== 1) return EMPTY;
  const bosses = (raw as BossRecordsV1).bosses;
  if (!bosses || typeof bosses !== 'object') return EMPTY;
  const clean: BossRecordsV1['bosses'] = {};
  for (const [id, value] of Object.entries(bosses)) {
    if (isRecord(value)) clean[id as FightId] = value;
  }
  return { version: 1, bosses: clean };
}

/** Folds one finished fight into the learner's records and returns the new records. */
export function recordFight(
  bossId: FightId,
  summary: Pick<BattleSummary, 'won' | 'stars' | 'rounds' | 'maxCombo'>,
  now: () => string = () => new Date().toISOString(),
): BossRecordsV1 {
  const records = readBossRecords();
  const before = records.bosses[bossId];
  const next: BossRecord = {
    fights: (before?.fights ?? 0) + 1,
    wins: (before?.wins ?? 0) + (summary.won ? 1 : 0),
    stars: Math.max(before?.stars ?? 0, summary.stars) as Stars,
    bestCombo: Math.max(before?.bestCombo ?? 0, summary.maxCombo),
    fastestWin: summary.won
      ? Math.min(before?.fastestWin ?? Number.POSITIVE_INFINITY, summary.rounds)
      : (before?.fastestWin ?? null),
    updatedAt: now(),
  };
  const merged: BossRecordsV1 = { version: 1, bosses: { ...records.bosses, [bossId]: next } };
  storageSet(STORAGE_KEYS.bossBattle, merged);
  return merged;
}

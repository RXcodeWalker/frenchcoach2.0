import { WORD_IDS, type WordId } from '../../data/questionWords/types';
import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import { emptyLadder, type LadderMap, type Rung, type WordLadder } from './ladder';

/**
 * Question Detective's only persistence: ladder, mix-up counts, solved cases
 * and personal bests. Local, versioned, never synced, never an XP write.
 */

export interface DetectiveStoreV1 {
  version: 1;
  rungs: LadderMap;
  mixups: Record<string, number>;
  casesSolved: string[];
  bests: { answer: number; ask: number };
  roundsPlayed: number;
}

const EMPTY: DetectiveStoreV1 = {
  version: 1,
  rungs: emptyLadder(),
  mixups: {},
  casesSolved: [],
  bests: { answer: 0, ask: 0 },
  roundsPlayed: 0,
};

function isRung(v: unknown): v is Rung {
  return v === 'tap' || v === 'type' || v === 'say';
}

function isWordLadder(v: unknown): v is WordLadder {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<WordLadder>;
  return isRung(r.rung) && typeof r.streak === 'number' && Number.isFinite(r.streak) && r.streak >= 0;
}

function parseLadder(raw: unknown): LadderMap {
  const out = emptyLadder();
  if (!raw || typeof raw !== 'object') return out;
  for (const id of WORD_IDS) {
    const value = (raw as Record<string, unknown>)[id];
    if (isWordLadder(value)) out[id] = value;
  }
  return out;
}

function parseMixups(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
  }
  return out;
}

export function readDetectiveStore(): DetectiveStoreV1 {
  const raw = storageGet<unknown>(STORAGE_KEYS.questionDetective, EMPTY);
  if (!raw || typeof raw !== 'object' || (raw as DetectiveStoreV1).version !== 1) return { ...EMPTY, rungs: emptyLadder() };
  const stored = raw as Partial<DetectiveStoreV1>;
  const casesSolved = Array.isArray(stored.casesSolved) ? stored.casesSolved.filter(id => typeof id === 'string') : [];
  const bests = stored.bests && typeof stored.bests === 'object'
    ? {
        answer: typeof stored.bests.answer === 'number' ? stored.bests.answer : 0,
        ask: typeof stored.bests.ask === 'number' ? stored.bests.ask : 0,
      }
    : EMPTY.bests;
  return {
    version: 1,
    rungs: parseLadder(stored.rungs),
    mixups: parseMixups(stored.mixups),
    casesSolved,
    bests,
    roundsPlayed: typeof stored.roundsPlayed === 'number' && stored.roundsPlayed > 0 ? Math.floor(stored.roundsPlayed) : 0,
  };
}

function write(next: DetectiveStoreV1): DetectiveStoreV1 {
  storageSet(STORAGE_KEYS.questionDetective, next);
  return next;
}

export function saveLadder(rungs: LadderMap): DetectiveStoreV1 {
  return write({ ...readDetectiveStore(), rungs });
}

export function recordMixup(key: string): DetectiveStoreV1 {
  const stored = readDetectiveStore();
  const mixups = { ...stored.mixups, [key]: (stored.mixups[key] ?? 0) + 1 };
  return write({ ...stored, mixups });
}

export function recordAnswerRound(correct: number): DetectiveStoreV1 {
  const stored = readDetectiveStore();
  return write({
    ...stored,
    roundsPlayed: stored.roundsPlayed + 1,
    bests: { ...stored.bests, answer: Math.max(stored.bests.answer, correct) },
  });
}

export function recordAskRound(correct: number): DetectiveStoreV1 {
  const stored = readDetectiveStore();
  return write({
    ...stored,
    bests: { ...stored.bests, ask: Math.max(stored.bests.ask, correct) },
  });
}

export function recordCaseSolved(id: string): DetectiveStoreV1 {
  const stored = readDetectiveStore();
  if (stored.casesSolved.includes(id)) return stored;
  return write({ ...stored, casesSolved: [...stored.casesSolved, id] });
}

export function topMixups(n = 2): Array<{ key: string; count: number }> {
  return Object.entries(readDetectiveStore().mixups)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function isCaseSolved(id: string): boolean {
  return readDetectiveStore().casesSolved.includes(id);
}

export function wordIds(): readonly WordId[] {
  return WORD_IDS;
}

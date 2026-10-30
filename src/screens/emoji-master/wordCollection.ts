import { storageGet, storageSet, STORAGE_KEYS } from '../../services/persistence/storage';
import type { EmojiQuestion } from '../../data/emojiQuestions';
import type { EmojiAnswerHistoryEntry } from './types';

/**
 * The learner's word collection: per word, how many answers in a row are
 * right. Three in a row (across runs and modes) makes a word "mastered"; a
 * miss sends it back to zero. Local only and separate from XP, sessions and
 * mastery — Emoji Master earns none of those.
 */
export const MASTERED_AT = 3;

export interface WordRecord {
  streak: number;
  right: number;
  wrong: number;
}

export interface WordCollectionV1 {
  version: 1;
  words: Record<string, WordRecord>;
}

const EMPTY: WordCollectionV1 = { version: 1, words: {} };

const isRecord = (v: unknown): v is WordRecord =>
  !!v &&
  typeof v === 'object' &&
  ['streak', 'right', 'wrong'].every((k) => Number.isFinite((v as Record<string, unknown>)[k]));

export function readWordCollection(): WordCollectionV1 {
  const raw = storageGet<unknown>(STORAGE_KEYS.emojiMasterWords, EMPTY);
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as WordCollectionV1).version === 1 &&
    (raw as WordCollectionV1).words &&
    typeof (raw as WordCollectionV1).words === 'object'
  ) {
    const words: Record<string, WordRecord> = {};
    for (const [id, rec] of Object.entries((raw as WordCollectionV1).words)) {
      if (isRecord(rec)) words[id] = rec;
    }
    return { version: 1, words };
  }
  return EMPTY;
}

export function isMastered(record: WordRecord | undefined): boolean {
  return (record?.streak ?? 0) >= MASTERED_AT;
}

export interface ApplyResult {
  collection: WordCollectionV1;
  /** Words that crossed into "mastered" during this run. */
  newlyMastered: string[];
}

/** Applies a run's answers, in order. Pure. */
export function applyOutcomes(
  collection: WordCollectionV1,
  history: readonly Pick<EmojiAnswerHistoryEntry, 'questionId' | 'isCorrect'>[]
): ApplyResult {
  const words = { ...collection.words };
  const before = new Set(Object.keys(words).filter((id) => isMastered(words[id])));
  for (const { questionId, isCorrect } of history) {
    const prev = words[questionId] ?? { streak: 0, right: 0, wrong: 0 };
    words[questionId] = isCorrect
      ? { streak: prev.streak + 1, right: prev.right + 1, wrong: prev.wrong }
      : { streak: 0, right: prev.right, wrong: prev.wrong + 1 };
  }
  const newlyMastered = Object.keys(words).filter((id) => isMastered(words[id]) && !before.has(id));
  return { collection: { version: 1, words }, newlyMastered };
}

/** Records a finished run and persists it. */
export function recordRun(
  history: readonly Pick<EmojiAnswerHistoryEntry, 'questionId' | 'isCorrect'>[]
): ApplyResult {
  const result = applyOutcomes(readWordCollection(), history);
  storageSet(STORAGE_KEYS.emojiMasterWords, result.collection);
  return result;
}

export interface CategorySummary {
  total: number;
  mastered: number;
}

export interface CollectionSummary {
  total: number;
  mastered: number;
  /** Tried at least once but not mastered yet. */
  learning: number;
  byCategory: Record<EmojiQuestion['category'], CategorySummary>;
}

/** Counts against the current bank, so a word that was removed no longer counts. */
export function summarizeCollection(
  collection: WordCollectionV1,
  bank: readonly EmojiQuestion[]
): CollectionSummary {
  const byCategory = {} as Record<EmojiQuestion['category'], CategorySummary>;
  let mastered = 0;
  let learning = 0;
  for (const q of bank) {
    const cat = (byCategory[q.category] ??= { total: 0, mastered: 0 });
    cat.total += 1;
    const rec = collection.words[q.id];
    if (isMastered(rec)) {
      mastered += 1;
      cat.mastered += 1;
    } else if (rec) {
      learning += 1;
    }
  }
  return { total: bank.length, mastered, learning, byCategory };
}

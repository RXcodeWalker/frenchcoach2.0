import { storageGet, storageSet, STORAGE_KEYS } from '../../services/persistence/storage';
import type { LetterGrade } from '../../features/minigames/utils/gradeFromStats';
import type {
  EndReason,
  EmojiMasterBestsV1,
  GameMode,
  ModeBestEntry,
  SessionCompletion,
} from './types';

const EMPTY: EmojiMasterBestsV1 = { version: 1, modes: {} };

export function readEmojiMasterBests(): EmojiMasterBestsV1 {
  const raw = storageGet<unknown>(STORAGE_KEYS.emojiMasterBests, EMPTY);
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as EmojiMasterBestsV1).version === 1 &&
    typeof (raw as EmojiMasterBestsV1).modes === 'object'
  ) {
    return raw as EmojiMasterBestsV1;
  }
  return EMPTY;
}

export function writeEmojiMasterBests(bests: EmojiMasterBestsV1): void {
  storageSet(STORAGE_KEYS.emojiMasterBests, bests);
}

export function getModeBest(mode: GameMode): ModeBestEntry | undefined {
  return readEmojiMasterBests().modes[mode];
}

export function shouldUpdatePersonalBest(
  endReason: EndReason,
  modeScore: number,
  existing?: ModeBestEntry
): boolean {
  if (endReason === 'quit') return false;
  if (!existing) return true;
  return modeScore > existing.modeScore;
}

export function updatePersonalBest(
  completion: SessionCompletion,
  grade: LetterGrade,
  now: () => string = () => new Date().toISOString()
): EmojiMasterBestsV1 {
  const bests = readEmojiMasterBests();
  const existing = bests.modes[completion.mode];

  if (
    !shouldUpdatePersonalBest(
      completion.endReason,
      completion.modeScore,
      existing
    )
  ) {
    return bests;
  }

  const next: EmojiMasterBestsV1 = {
    version: 1,
    modes: {
      ...bests.modes,
      [completion.mode]: {
        modeScore: completion.modeScore,
        maxStreak: Math.max(existing?.maxStreak ?? 0, completion.maxStreak),
        bestGrade: grade,
        updatedAt: now(),
      },
    },
  };
  writeEmojiMasterBests(next);
  return next;
}

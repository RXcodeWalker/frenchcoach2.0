import { QUESTIONS } from '../../data/questions';
import { pickPracticeSentences } from '../../domain/pronunciation/lab/practiceSentences';
import type { SoundFamilyId } from '../../domain/pronunciation/lab/types';

const MODEL_ANSWERS = QUESTIONS.filter((q) => q.modelAnswer).map((q) => q.modelAnswer);

/**
 * One sentence for today's plan: a Learn model answer's sentence (always
 * recorded, so ▶ Native costs nothing), with `family` in its spelling when
 * there is one, else any. Null only when the bank has no practice sentence.
 */
export function pickTodaySentence(family: SoundFamilyId | null): string | null {
  const [withSound] = family ? pickPracticeSentences(MODEL_ANSWERS, { family, limit: 1 }) : [];
  if (withSound) return withSound;
  return pickPracticeSentences(MODEL_ANSWERS, { limit: 1 })[0] ?? null;
}

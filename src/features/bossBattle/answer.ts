import { normalizeFrench } from '../minigames/utils/normalizeFrench';
import type { BossQuestion } from './bank';

/**
 * Canonical form for comparing a typed answer with an accepted one: the shared
 * `normalizeFrench` (case, accents, punctuation, curly apostrophes), plus
 * hyphens read as spaces (`appelle-moi` = `appelle moi`), `œ`/`æ` read as
 * `oe`/`ae`, and a final trim — `normalizeFrench` trims before it strips
 * punctuation, so `ça !` would otherwise keep a trailing space.
 */
export function canonicalAnswer(text: string): string {
  return normalizeFrench(
    text
      .replace(/[-‐‑–—]/g, ' ')
      .replace(/œ/gi, 'oe')
      .replace(/æ/gi, 'ae'),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrectAnswer(question: Pick<BossQuestion, 'french'>, typed: string): boolean {
  const attempt = canonicalAnswer(typed);
  if (attempt === '') return false;
  return question.french.some((accepted) => canonicalAnswer(accepted) === attempt);
}

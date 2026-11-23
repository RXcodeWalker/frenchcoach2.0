/**
 * Role-play drill answer keys — the pure matcher.
 *
 * Each drill task names the things it asks for (`StoryTask.parts`, e.g. "when"
 * + "how long"); a part counts as communicated when any one of its accept
 * patterns is found in the answer. The marking principle this mirrors is
 * TN p.6 (PRINCIPLE_RP_CONCISE in src/domain/igcse/canonical.ts): a short
 * response that communicates the task fully and correctly is worth 2 marks,
 * so the patterns look for the information, never for a full sentence.
 *
 * Matching is done on a normalised answer: lower case, accents removed,
 * œ/æ spelled out, and everything that is not a letter or digit (apostrophes,
 * hyphens, punctuation) turned into a single space. So « J'ai acheté
 * l'aller-retour. » is read as `j ai achete l aller retour`.
 *
 * An accept pattern is either
 *  - a string: a word or phrase, normalised the same way and matched on whole
 *    words (« la gare » matches "à la gare", never "égare"); a trailing `*`
 *    matches any word that starts with it (`fatigu*` → fatigué, fatiguée), or
 *  - a RegExp tested against the normalised answer (write it unaccented, with
 *    spaces where the answer had an apostrophe or hyphen; no `g` flag).
 *
 * This module only reads text and nothing here writes a mark, XP or evidence.
 * The drill's coaching builds on it: domain/rolePlayDrill/checkAnswer.ts.
 */

export type AcceptPattern = string | RegExp;

export interface AnswerPart {
  /** What this part of the task asks for, in English ("when", "how long"). */
  label: string;
  /** The part is communicated when any one pattern matches. */
  accept: readonly AcceptPattern[];
}

/** Lower case, no accents, letters and digits only, single spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether one pattern matches an already-normalised answer. */
export function patternMatches(normalized: string, pattern: AcceptPattern): boolean {
  if (typeof pattern !== 'string') {
    pattern.lastIndex = 0;
    return pattern.test(normalized);
  }
  const prefix = pattern.endsWith('*');
  const phrase = normalizeAnswer(prefix ? pattern.slice(0, -1) : pattern);
  if (!phrase) return false;
  if (prefix) return new RegExp(`(^| )${escapeRegExp(phrase)}`).test(normalized);
  return ` ${normalized} `.includes(` ${phrase} `);
}

export function partMatches(answer: string, part: AnswerPart): boolean {
  const normalized = normalizeAnswer(answer);
  return part.accept.some((p) => patternMatches(normalized, p));
}

export interface PartsCheck {
  /** One entry per part, in the task's order. */
  parts: { label: string; found: boolean }[];
  /** Every part was found. */
  complete: boolean;
}

/** Which of a task's parts the answer communicates. */
export function checkAnswerParts(answer: string, parts: readonly AnswerPart[]): PartsCheck {
  const found = parts.map((part) => ({ label: part.label, found: partMatches(answer, part) }));
  return { parts: found, complete: found.length > 0 && found.every((p) => p.found) };
}

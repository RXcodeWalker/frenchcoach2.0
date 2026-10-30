import type { Question } from '../../types';
import { QUESTIONS } from '../../data/questions';
import { normalizeAnswer } from './matching';
import type { Direction, PlayWord, PoolWord } from './types';

/**
 * Word Drop plays the vocabulary the learner already meets in Learn: every
 * question's `keyVocab`. That bank also holds sentence frames ("je trouve
 * que…"), alternatives ("utile/inutile") and multi-sense glosses ("a test /
 * assessment"), so this module keeps only what makes a fair falling word and
 * turns the English gloss into every answer worth accepting.
 */

const MAX_FR_LENGTH = 22;
const MAX_FR_TOKENS = 3;
const MAX_EN_LENGTH = 28;
const MAX_EN_TOKENS = 4;
const MAX_SENSES = 4;

// A frame, a question, a pair of alternatives or an aside is not a single falling word.
const NOT_A_WORD = /[…?!+=:;,/]|\.\.\./;

const GENDER_ENDING = /\((e|es|s|ne)\)/g;

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** The French as shown, or null when it isn't a fair falling word. */
export function cleanFrench(fr: string): string | null {
  const t = fr.trim().replace(/\s+/g, ' ');
  if (t.length === 0 || t.length > MAX_FR_LENGTH) return null;
  if (NOT_A_WORD.test(t)) return null;
  if (words(t) > MAX_FR_TOKENS) return null;
  return t;
}

/** Every French spelling worth accepting: "fascinant(e)" takes fascinant and fascinante. */
export function frenchAnswers(display: string): string[] {
  const out = new Set<string>();
  const suffix = [...display.matchAll(GENDER_ENDING)].map(m => m[1])[0];
  const base = display.replace(GENDER_ENDING, '').replace(/\([^)]*\)/g, '').trim();
  out.add(normalizeAnswer(base, 'fr'));
  if (suffix && suffix !== 'ne') out.add(normalizeAnswer(base + suffix, 'fr'));
  return [...out].filter(a => a.length >= 2);
}

/** The English senses of a gloss, as shown ("to reduce", "a test"), parentheticals dropped. */
export function englishSenses(en: string): string[] {
  if (/…|\.\.\./.test(en)) return [];
  const stripped = en.replace(/\([^)]*\)/g, ' ');
  const senses = stripped
    .split(/\s*(?:\/|;|,|\bor\b)\s*/i)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length >= 2);
  return [...new Set(senses)].slice(0, MAX_SENSES);
}

/** One `keyVocab` pair as a pool word, or null when it can't be played fairly. */
export function parsePair(fr: string, en: string, topicKey: string): PoolWord | null {
  const frDisplay = cleanFrench(fr);
  if (!frDisplay) return null;
  const senses = englishSenses(en);
  if (senses.length === 0) return null;
  const enDisplay = senses[0];
  if (enDisplay.length > MAX_EN_LENGTH || words(enDisplay) > MAX_EN_TOKENS) return null;

  const enAnswers = [...new Set(senses.map(s => normalizeAnswer(s, 'en')).filter(a => a.length >= 2))];
  const frAnswers = frenchAnswers(frDisplay);
  if (enAnswers.length === 0 || frAnswers.length === 0) return null;

  return { id: normalizeAnswer(frDisplay, 'fr'), fr: frDisplay, en: enDisplay, enAnswers, frAnswers, topicKey };
}

/** The pool from a question bank: unique by French word, answers merged. */
export function buildPool(questions: readonly Pick<Question, 'topicKey' | 'keyVocab'>[]): PoolWord[] {
  const byId = new Map<string, PoolWord>();
  for (const q of questions) {
    for (const pair of q.keyVocab ?? []) {
      const word = parsePair(pair.fr, pair.en, q.topicKey);
      if (!word) continue;
      const seen = byId.get(word.id);
      if (!seen) {
        byId.set(word.id, word);
      } else {
        seen.enAnswers = [...new Set([...seen.enAnswers, ...word.enAnswers])];
        seen.frAnswers = [...new Set([...seen.frAnswers, ...word.frAnswers])];
      }
    }
  }
  return [...byId.values()];
}

/**
 * The pool resolved for one direction. English falling has to merge words that
 * share a gloss (par contre / en revanche are both "on the other hand"), or a
 * correct answer would be marked wrong.
 */
export function playWords(pool: readonly PoolWord[], direction: Direction): PlayWord[] {
  if (direction === 'fr-en') {
    return pool.map(w => ({
      id: w.id,
      text: w.fr,
      accept: w.enAnswers,
      answer: w.en,
      fr: w.fr,
      en: w.en,
      topicKey: w.topicKey,
    }));
  }
  const byGloss = new Map<string, PlayWord>();
  for (const w of pool) {
    const key = normalizeAnswer(w.en, 'en');
    const seen = byGloss.get(key);
    if (!seen) {
      byGloss.set(key, {
        id: `en:${key}`,
        text: w.en,
        accept: [...w.frAnswers],
        answer: w.fr,
        fr: w.fr,
        en: w.en,
        topicKey: w.topicKey,
      });
    } else {
      seen.accept = [...new Set([...seen.accept, ...w.frAnswers])];
    }
  }
  return [...byGloss.values()];
}

/** How many playable words each topic holds. */
export function topicCounts(pool: readonly PoolWord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const w of pool) counts[w.topicKey] = (counts[w.topicKey] ?? 0) + 1;
  return counts;
}

let cached: PoolWord[] | null = null;

/** The pool for the real question bank, built once. */
export function getWordPool(): PoolWord[] {
  if (!cached) cached = buildPool(QUESTIONS);
  return cached;
}

import minigameQuestions from '../../data/scenarios/minigameQuestions.json';
import { EMOJI_QUESTIONS } from '../../data/emojiQuestions';
import { QUESTIONS, TOPICS } from '../../data/questions';
import { normalizeFrench } from '../minigames/utils/normalizeFrench';

/**
 * Rapid Fire's word bank: what the learner is shown (English) and every French
 * spelling that counts. Built once from data the app already has — the Learn
 * bank's key vocabulary, the Emoji Master nouns and the minigame phrases — so
 * nothing here is new content.
 *
 * The Learn vocabulary is written for a glossary, not for typing back
 * ("fascinant(e)", "le/la proviseur(e)", "utile/inutile"), so `parseVocab`
 * turns each entry into something a learner can actually type, or drops it.
 */

export type WordLevel = 1 | 2 | 3;

export interface RapidFireWord {
  id: string;
  /** English shown to the learner. */
  prompt: string;
  /** Accepted French spellings, accents included. The first is the one shown as the answer. */
  answers: string[];
  level: WordLevel;
}

export type WordSetKind = 'mixed' | 'phrases' | 'objects' | 'topic';

export interface WordSet {
  id: string;
  kind: WordSetKind;
  /** English name shown on the picker. */
  label: string;
  /** Topic key for `kind === 'topic'` (drives the icon chip). */
  topicKey?: string;
  words: RapidFireWord[];
}

/** Longest French answer, in words, that still suits a 60-second sprint. */
const MAX_ANSWER_WORDS = 4;
/** A glossary line with several gender/article forms keeps this many accepted spellings. */
const MAX_ANSWERS = 8;

const ARTICLE_PAIR = /^(le|la|l'|un|une)\/(le|la|l'|un|une)\s+/i;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const FEMININE_SUFFIX = /^(e|ne|le|te|se|ve|euse|ère|ere|trice|ice|enne|ienne)$/i;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** "couturier" + "ère" → "couturière"; "ennuyeux" + "se" → "ennuyeuse"; "vif" + "ve" → "vive"; "bon" + "ne" → "bonne". */
function applySuffix(base: string, suffix: string): string {
  const drop = /[xf]$/.test(base);
  if (suffix.length <= 2) return (drop && /^[sv]e$/.test(suffix) ? base.slice(0, -1) : base) + suffix;
  const first = stripAccents(suffix)[0];
  const at = stripAccents(base).lastIndexOf(first);
  if (at > 0 && at >= base.length - 5) return base.slice(0, at) + suffix;
  return (drop ? base.slice(0, -1) : base) + suffix;
}

/** "fascinant(e)" → ["fascinant", "fascinante"]; "s'entendre (bien)" → ["s'entendre", "s'entendre bien"]. */
function expandParens(s: string): string[] {
  const m = s.match(/\(([^()]*)\)/);
  if (!m || m.index === undefined) return [s];
  const before = s.slice(0, m.index);
  const after = s.slice(m.index + m[0].length);
  const inside = m[1].trim();
  const attached = before.length > 0 && !/\s$/.test(before);
  const without = (before + after).replace(/\s{2,}/g, ' ').trim();
  let withIt: string;
  if (attached) {
    // "méticuleux(euse)" ends the word; "un(e)" is the same idea mid-phrase.
    const wordStart = before.search(/\S+$/);
    const word = before.slice(wordStart);
    withIt = before.slice(0, wordStart) + applySuffix(word, inside) + after;
  } else {
    withIt = `${before}${inside}${after}`.replace(/\s{2,}/g, ' ').trim();
  }
  const out: string[] = [];
  for (const variant of [without, withIt]) {
    for (const rest of expandParens(variant)) out.push(rest);
  }
  return out;
}

/** "sympa (= sympathique)" → ["sympa", "sympathique"]. */
function expandEquals(s: string): string[] {
  const m = s.match(/^(.*?)\s*\(=\s*([^)]+)\)\s*$/);
  return m ? [m[1].trim(), m[2].trim()] : [s];
}

/** "le/la proviseur(e)" → ["le proviseur(e)", "la proviseur(e)"]. */
function expandArticlePair(s: string): string[] {
  const m = s.match(ARTICLE_PAIR);
  if (!m) return [s];
  const rest = s.slice(m[0].length);
  return [m[1], m[2]].map(article => `${article}${article.endsWith("'") ? '' : ' '}${rest}`);
}

function splitSlash(s: string): string[] {
  return s.split(/\s*\/\s*/).map(p => p.trim()).filter(Boolean);
}

/** "ennuyeux/euse" lists a base and its feminine ending; everything else after a slash is a whole alternative. */
function slashAlternatives(s: string): string[] {
  const parts = splitSlash(s);
  const [first, ...rest] = parts;
  return [first, ...rest.map(p => (!/\s/.test(first) && FEMININE_SUFFIX.test(p) ? applySuffix(first, p) : p))];
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = normalizeFrench(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Every typed spelling a single French glossary string stands for. */
function frenchVariants(fr: string): string[] {
  const pieces = expandEquals(fr.trim());
  return dedupe(
    pieces.flatMap(piece => expandArticlePair(piece)).flatMap(piece => expandParens(piece)),
  );
}

export interface ParsedVocab {
  prompt: string;
  answers: string[];
}

/**
 * One glossary entry → zero or more typable cards. Returns nothing for an entry
 * that cannot be answered from the English alone ("je trouve que...",
 * "jouer de (+ instrument)") or is too long for a sprint.
 */
export function parseVocab(en: string, fr: string): ParsedVocab[] {
  const english = en.trim().replace(/[.!]+$/, '');
  const french = fr.trim();
  if (!english || !french) return [];
  if (/\.{2,}|…|\+|\?/.test(french) || /\.{2,}|…/.test(english)) return [];

  // "useful/useless" → "utile/inutile": the same number of slash parts on both
  // sides is a list of pairs, so each pair becomes its own card.
  const enParts = splitSlash(english);
  const frParts = splitSlash(french);
  const bothSlashed = /\//.test(english) && /\//.test(french);
  const pairs: Array<[string, string]> =
    bothSlashed && enParts.length >= 2 && enParts.length === frParts.length && !ARTICLE_PAIR.test(french)
      ? enParts.map((e, i) => [e, frParts[i]])
      : [[english, french]];

  const out: ParsedVocab[] = [];
  for (const [prompt, glossary] of pairs) {
    // A slash in the French alone ("cadet/cadette") lists accepted alternatives.
    const answers = dedupe(
      (ARTICLE_PAIR.test(glossary) ? [glossary] : slashAlternatives(glossary)).flatMap(frenchVariants),
    );
    if (answers.length === 0 || answers.some(a => wordCount(a) > MAX_ANSWER_WORDS)) continue;
    out.push({ prompt, answers: answers.slice(0, MAX_ANSWERS) });
  }
  return out;
}

const SENTENCE_LEVEL: Record<string, WordLevel> = { easy: 1, medium: 2, hard: 3 };

function sentenceLevel(label: string): WordLevel {
  return SENTENCE_LEVEL[label] ?? 2;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mergeWords(words: RapidFireWord[]): RapidFireWord[] {
  // Two glossary lines with the same English accept each other's French.
  const byPrompt = new Map<string, RapidFireWord>();
  for (const w of words) {
    const key = w.prompt.toLowerCase();
    const existing = byPrompt.get(key);
    if (!existing) {
      byPrompt.set(key, { ...w });
      continue;
    }
    existing.answers = dedupe([...existing.answers, ...w.answers]);
    existing.level = Math.min(existing.level, w.level) as WordLevel;
  }
  return [...byPrompt.values()];
}

function buildBank(): WordSet[] {
  let n = 0;
  const nextId = (prefix: string) => `${prefix}-${n++}`;

  const phrases: RapidFireWord[] = [];
  const objects: RapidFireWord[] = [];
  const byTopic = new Map<string, RapidFireWord[]>();

  for (const q of minigameQuestions as Array<{ difficulty: string; english: string; french: string | string[] }>) {
    const answers = dedupe(Array.isArray(q.french) ? q.french : [q.french]);
    const prompt = q.english.trim().replace(/[.!]+$/, '');
    if (answers.length === 0 || !prompt) continue;
    phrases.push({ id: nextId('p'), prompt, answers, level: sentenceLevel(q.difficulty) });
  }

  for (const q of EMOJI_QUESTIONS) {
    const word: RapidFireWord = {
      id: nextId('o'),
      prompt: capitalise(q.english.trim()),
      answers: [q.french.trim()],
      level: q.difficulty,
    };
    (q.category === 'sentences' ? phrases : objects).push(word);
  }

  for (const q of QUESTIONS) {
    for (const v of q.keyVocab ?? []) {
      for (const parsed of parseVocab(v.en, v.fr)) {
        const list = byTopic.get(q.topicKey) ?? [];
        list.push({ id: nextId('v'), prompt: parsed.prompt, answers: parsed.answers, level: q.difficulty });
        byTopic.set(q.topicKey, list);
      }
    }
  }

  const sets: WordSet[] = [];
  const topicSets: WordSet[] = [];
  for (const topic of TOPICS) {
    if (topic.isAdvanced) continue;
    const words = mergeWords(byTopic.get(topic.key) ?? []);
    if (words.length < MIN_TOPIC_WORDS) continue;
    topicSets.push({ id: topic.key, kind: 'topic', label: topic.labelEn, topicKey: topic.key, words });
  }

  const mixed = mergeWords([...phrases, ...objects, ...topicSets.flatMap(s => s.words)]);
  sets.push({ id: 'mixed', kind: 'mixed', label: 'Mixed', words: mixed });
  sets.push({ id: 'phrases', kind: 'phrases', label: 'Phrases', words: mergeWords(phrases) });
  sets.push({ id: 'objects', kind: 'objects', label: 'Everyday objects', words: mergeWords(objects) });
  sets.push(...topicSets);
  return sets;
}

/** A topic needs at least this many cards to make a varied 60 seconds. */
const MIN_TOPIC_WORDS = 40;

let bank: WordSet[] | null = null;

/** Every word set, built once on first use. */
export function getWordSets(): WordSet[] {
  if (!bank) bank = buildBank();
  return bank;
}

export function getWordSet(id: string): WordSet | undefined {
  return getWordSets().find(s => s.id === id);
}

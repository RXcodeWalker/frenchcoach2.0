/**
 * Deterministic lint over the Junior content bank (plan Batch 1), modelled on
 * learnBankLint.ts: a pure function over data, run by its test (and, later, by any
 * authoring check), never at runtime — so a lint finding can never hide a mission
 * from a kid.
 *
 * Every rule here comes from the plan's Batch 1 list or its content rules (≤ 8-word
 * sentences, no question about the kid's gender, gendered adjectives listing both
 * forms), so every finding is an error. French accuracy is NOT something a lint can
 * establish: a French teacher reviews the pilot sentences and accepted variants
 * before release.
 *
 * Does not import from src/domain/igcse/ (Junior is a separate, mark-free track).
 */
import { SLOT_MARKER, renderSentence, sentenceAudioId } from './sentence';
import type { JuniorArticle, JuniorBank, JuniorFrame, JuniorGender, JuniorLine, JuniorPattern, JuniorQuestion, JuniorSlotOption } from './types';

export interface JuniorLintIssue {
  code:
    | 'sentence-too-long'
    | 'missing-text'
    | 'audio-id'
    | 'audio-id-duplicate'
    | 'duplicate-id'
    | 'unknown-theme'
    | 'unknown-pattern'
    | 'pattern-core-words'
    | 'pattern-template-mismatch'
    | 'frame-count'
    | 'frame-template'
    | 'slot-options'
    | 'slot-picture'
    | 'slot-article'
    | 'article-gender'
    | 'article-elision'
    | 'gendered-adjective'
    | 'model-answer'
    | 'theme-stickers'
    | 'theme-unlock'
    | 'theme-et-toi'
    | 'theme-questions';
  /** The id of the theme / question / pattern / line the finding is about. */
  id: string;
  message: string;
}

/** Plan §11: sentences are at most 8 words. Applies to every line a kid reads or hears. */
export const MAX_SENTENCE_WORDS = 8;
export const MIN_FRAMES = 1;
export const MAX_FRAMES = 2;
/** A pick needs a choice (2) and must stay scannable on a phone (6). */
export const MIN_SLOT_OPTIONS = 2;
export const MAX_SLOT_OPTIONS = 6;
/** "About 6" stickers per theme. */
export const MIN_STICKERS = 5;
export const MAX_STICKERS = 8;
/** A mission is 4–5 question turns, so a theme needs at least that many to build one. */
export const MIN_QUESTIONS_PER_THEME = 5;

const AUDIO_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const COMBINING_MARKS = /[̀-ͯ]/g;

const ARTICLE_GENDERS: Record<JuniorArticle, readonly JuniorGender[]> = {
  le: ['m'],
  la: ['f'],
  "l'": ['m', 'f'],
  les: ['pl'],
  un: ['m'],
  une: ['f'],
};

/**
 * Gendered adjective pairs (masculine, feminine). A word from here may only be a pick
 * if the other form is listed as an accepted variant, and may never sit in fixed
 * template text where the kid cannot choose between the forms. Not exhaustive:
 * extend it when a new theme introduces a new adjective.
 */
export const GENDERED_ADJECTIVES: ReadonlyArray<readonly [string, string]> = [
  ['bleu', 'bleue'],
  ['vert', 'verte'],
  ['noir', 'noire'],
  ['blanc', 'blanche'],
  ['violet', 'violette'],
  ['gris', 'grise'],
  ['brun', 'brune'],
  ['grand', 'grande'],
  ['petit', 'petite'],
  ['content', 'contente'],
  ['fatigué', 'fatiguée'],
  ['fort', 'forte'],
  ['blond', 'blonde'],
];

function fold(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Words as a reader counts them: « J'aime » and « Qu'est-ce » are one; « « », « ! » are none. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Folded tokens split on everything that is not a letter or digit (« c'est » → c, est). */
function tokens(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function startsWithVowel(word: string): boolean {
  return /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(word);
}

function genderedPair(word: string): readonly [string, string] | undefined {
  const w = word.normalize('NFC').toLowerCase();
  return GENDERED_ADJECTIVES.find(([m, f]) => w === m || w === f);
}

class Collector {
  readonly issues: JuniorLintIssue[] = [];
  private readonly audioOwners = new Map<string, string>();

  add(code: JuniorLintIssue['code'], id: string, message: string): void {
    this.issues.push({ code, id, message });
  }

  /** Validate an audio id's shape and that no two Léo lines share a recording. */
  audio(audioId: string | undefined, owner: string): void {
    if (typeof audioId !== 'string' || !AUDIO_ID.test(audioId)) {
      this.add('audio-id', owner, `${owner}: needs a lowercase audio-file id (a-z, 0-9, ".", "-", "_"), got ${JSON.stringify(audioId)}`);
      return;
    }
    const prior = this.audioOwners.get(audioId);
    if (prior !== undefined) {
      this.add('audio-id-duplicate', owner, `${owner}: audio id "${audioId}" is already used by ${prior}`);
    } else {
      this.audioOwners.set(audioId, owner);
    }
  }

  /** A Léo/kid line: French text, an English helper, an audio id, ≤ 8 words. */
  line(l: JuniorLine | undefined, owner: string): void {
    if (!l || typeof l.fr !== 'string' || l.fr.trim() === '') {
      this.add('missing-text', owner, `${owner}: needs French text`);
      return;
    }
    if (typeof l.en !== 'string' || l.en.trim() === '') this.add('missing-text', owner, `${owner}: needs an English helper (en)`);
    this.sentence(l.fr, owner);
    this.audio(l.audioId, owner);
  }

  sentence(fr: string, owner: string): void {
    const words = countWords(fr);
    if (words > MAX_SENTENCE_WORDS) {
      this.add('sentence-too-long', owner, `${owner}: "${fr}" is ${words} words; the limit is ${MAX_SENTENCE_WORDS}`);
    }
  }

  unique(ids: readonly string[], kind: string, owner: string): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) this.add('duplicate-id', owner, `${owner}: duplicate ${kind} id "${id}"`);
      seen.add(id);
    }
  }
}

function lintPattern(pattern: JuniorPattern, out: Collector): void {
  if (!Array.isArray(pattern.coreWords) || pattern.coreWords.length === 0) {
    out.add('pattern-core-words', pattern.id, `${pattern.id}: needs at least one core word for the matcher`);
  }
  out.line(pattern.levelUp, `${pattern.id} levelUp`);
}

function lintSlotOption(option: JuniorSlotOption, pattern: JuniorPattern | undefined, owner: string, out: Collector): void {
  const where = `${owner} option "${option.id}"`;
  if (typeof option.word !== 'string' || option.word.trim() === '') out.add('missing-text', where, `${where}: needs a French word`);
  if (typeof option.en !== 'string' || option.en.trim() === '') out.add('missing-text', where, `${where}: needs an English gloss (en)`);
  if (typeof option.emoji !== 'string' || option.emoji.trim() === '') {
    out.add('slot-picture', where, `${where}: every pick needs a picture (emoji)`);
  }

  if (pattern) {
    const takesArticle = pattern.slotKind === 'noun';
    if (takesArticle && (option.article === null || option.gender === null)) {
      out.add('slot-article', where, `${where}: a noun pick needs an article and a gender`);
    }
    if (!takesArticle && (option.article !== null || option.gender !== null)) {
      out.add('slot-article', where, `${where}: a ${pattern.slotKind} pick cannot take an article or gender`);
    }
  }

  if (option.article !== null && option.gender !== null) {
    const allowed = ARTICLE_GENDERS[option.article];
    if (!allowed.includes(option.gender)) {
      out.add('article-gender', where, `${where}: article "${option.article}" does not agree with gender "${option.gender}"`);
    }
    const word = option.word ?? '';
    if ((option.article === 'le' || option.article === 'la') && /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(word)) {
      out.add('article-elision', where, `${where}: "${option.article} ${word}" must elide to "l'${word}"`);
    }
    if (option.article === "l'" && word !== '' && !startsWithVowel(word) && !/^h/i.test(word)) {
      out.add('article-elision', where, `${where}: "l'${word}" cannot elide before a consonant`);
    }
  }

  // Gendered adjectives: only an adjective pick is something the kid might need to inflect.
  if (pattern?.slotKind === 'adjective') {
    const pair = genderedPair(option.word ?? '');
    if (pair) {
      const accepted = new Set([option.word, ...(option.variants ?? [])].map((w) => w.normalize('NFC').toLowerCase()));
      if (!accepted.has(pair[0]) || !accepted.has(pair[1])) {
        out.add(
          'gendered-adjective',
          where,
          `${where}: "${option.word}" is gendered; it must accept both forms (${pair[0]} / ${pair[1]}) via word + variants`,
        );
      }
    }
  }
}

function lintFrame(
  frame: JuniorFrame,
  index: number,
  question: JuniorQuestion,
  patterns: ReadonlyMap<string, JuniorPattern>,
  out: Collector,
): string[] {
  const owner = `${question.id} frame ${index + 1}`;
  const pattern = patterns.get(frame.patternId);
  if (!pattern) out.add('unknown-pattern', owner, `${owner}: pattern "${frame.patternId}" is not in the pattern registry`);

  const slotCount = (s: string) => s.split(SLOT_MARKER).length - 1;
  if (slotCount(frame.template) !== 1) out.add('frame-template', owner, `${owner}: template needs exactly one ${SLOT_MARKER}`);
  if (slotCount(frame.templateEn) !== 1) out.add('frame-template', owner, `${owner}: templateEn needs exactly one ${SLOT_MARKER}`);

  if (pattern) {
    const templateTokens = new Set(tokens(frame.template));
    for (const core of pattern.coreWords) {
      if (!tokens(core).every((t) => templateTokens.has(t))) {
        out.add('pattern-template-mismatch', owner, `${owner}: template "${frame.template}" lacks the core word "${core}" of pattern "${pattern.id}"`);
      }
    }
  }

  // Gendered adjectives in fixed text: the kid cannot choose a form there.
  for (const t of tokens(frame.template.split(SLOT_MARKER).join(' '))) {
    if (genderedPair(t)) out.add('gendered-adjective', owner, `${owner}: fixed template text contains the gendered adjective "${t}"`);
  }

  const options = Array.isArray(frame.slotOptions) ? frame.slotOptions : [];
  if (options.length < MIN_SLOT_OPTIONS || options.length > MAX_SLOT_OPTIONS) {
    out.add('slot-options', owner, `${owner}: needs ${MIN_SLOT_OPTIONS}–${MAX_SLOT_OPTIONS} picks, has ${options.length}`);
  }
  out.unique(options.map((o) => o.id), 'option', owner);

  const sentences: string[] = [];
  options.forEach((option) => {
    lintSlotOption(option, pattern, owner, out);
    const sentence = renderSentence(frame.template, option);
    sentences.push(sentence);
    out.sentence(sentence, `${owner} option "${option.id}"`);
    out.audio(sentenceAudioId(question.id, index, option.id), `${owner} option "${option.id}" sentence`);
  });
  return sentences;
}

function lintQuestion(
  question: JuniorQuestion,
  themeIds: ReadonlySet<string>,
  patterns: ReadonlyMap<string, JuniorPattern>,
  out: Collector,
): void {
  if (!themeIds.has(question.themeId)) {
    out.add('unknown-theme', question.id, `${question.id}: theme "${question.themeId}" is not in the theme list`);
  }
  if (typeof question.emoji !== 'string' || question.emoji.trim() === '') {
    out.add('slot-picture', question.id, `${question.id}: the question needs a picture (emoji)`);
  }
  out.line(question.prompt, `${question.id} prompt`);

  const frames = Array.isArray(question.frames) ? question.frames : [];
  if (frames.length < MIN_FRAMES || frames.length > MAX_FRAMES) {
    out.add('frame-count', question.id, `${question.id}: needs ${MIN_FRAMES}–${MAX_FRAMES} frames, has ${frames.length}`);
  }
  const rendered = frames.map((frame, i) => lintFrame(frame, i, question, patterns, out));

  const model = Array.isArray(question.modelAnswer) ? question.modelAnswer : [];
  if (model.length !== frames.length) {
    out.add('model-answer', question.id, `${question.id}: needs one model sentence per frame (${frames.length}), has ${model.length}`);
  } else {
    model.forEach((sentence, i) => {
      if (typeof sentence !== 'string' || sentence.trim() === '') {
        out.add('model-answer', question.id, `${question.id}: model sentence ${i + 1} is empty`);
      } else if (!rendered[i].includes(sentence)) {
        out.add('model-answer', question.id, `${question.id}: model sentence "${sentence}" cannot be built from frame ${i + 1}'s picks`);
      }
    });
  }
}

/** Lint the whole Junior bank. Pure; issues follow the order themes → patterns → questions → fixed lines. */
export function lintJuniorBank(bank: JuniorBank): JuniorLintIssue[] {
  const out = new Collector();

  out.unique(bank.themes.map((t) => t.id), 'theme', 'themes');
  out.unique(bank.patterns.map((p) => p.id), 'pattern', 'patterns');
  out.unique(bank.questions.map((q) => q.id), 'question', 'questions');
  const themeIds = new Set(bank.themes.map((t) => t.id));
  const patterns = new Map(bank.patterns.map((p) => [p.id, p] as const));

  for (const theme of bank.themes) {
    out.line(theme.title, `${theme.id} title`);
    const stickers = Array.isArray(theme.stickers) ? theme.stickers : [];
    if (stickers.length < MIN_STICKERS || stickers.length > MAX_STICKERS) {
      out.add('theme-stickers', theme.id, `${theme.id}: needs a set of ${MIN_STICKERS}–${MAX_STICKERS} stickers, has ${stickers.length}`);
    }
    out.unique(stickers.map((s) => s.id), 'sticker', theme.id);
    if (stickers.some((s) => !s.emoji || !s.name)) {
      out.add('theme-stickers', theme.id, `${theme.id}: every sticker needs an emoji and a name`);
    }
    if (!theme.unlock || !theme.unlock.id || !theme.unlock.emoji || !theme.unlock.name || !['outfit', 'background'].includes(theme.unlock.kind)) {
      out.add('theme-unlock', theme.id, `${theme.id}: needs an unlock (an outfit or a background) for completing the set`);
    }
    const etToi = Array.isArray(theme.etToi) ? theme.etToi : [];
    if (etToi.length === 0) out.add('theme-et-toi', theme.id, `${theme.id}: needs at least one « Et toi ? » turn with Léo's reply`);
    out.unique(etToi.map((e) => e.id), 'et-toi', theme.id);
    for (const turn of etToi) {
      out.line(turn.ask, `${theme.id} ${turn.id} ask`);
      out.line(turn.reply, `${theme.id} ${turn.id} reply`);
    }
    const count = bank.questions.filter((q) => q.themeId === theme.id).length;
    if (count < MIN_QUESTIONS_PER_THEME) {
      out.add('theme-questions', theme.id, `${theme.id}: has ${count} questions; a mission needs a theme with at least ${MIN_QUESTIONS_PER_THEME}`);
    }
  }

  for (const pattern of bank.patterns) lintPattern(pattern, out);
  for (const question of bank.questions) lintQuestion(question, themeIds, patterns, out);
  bank.fixedLines.forEach((l, i) => out.line(l, `fixed line ${i + 1} (${l?.audioId ?? '?'})`));

  return out.issues;
}

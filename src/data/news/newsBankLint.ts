/**
 * Deterministic lint over the Daily News bank — docs/systems/daily-news.md §1.
 * Run by `src/data/news/__tests__/newsBankLint.test.ts` (errors fail the suite),
 * never at runtime. Modelled on src/data/learnBankLint.ts: rules the data
 * contract states are errors; `unreviewed` is a warning, because the real check
 * on the French is a human one (content-authoring §16).
 */
import { cueOccurs, matchFacts } from '../../features/news/matchFacts';
import { NEWS_LEVELS, type NewsEdition, type NewsLevel, type NewsLevelId } from './types';

export type NewsLintSeverity = 'error' | 'warning';

export interface NewsLintIssue {
  severity: NewsLintSeverity;
  editionId: string;
  level?: NewsLevelId;
  code: string;
  message: string;
}

/** Per level: sentence count range and the word ceiling for the whole story. */
export const LEVEL_LIMITS: Record<NewsLevelId, { minSentences: number; maxSentences: number; maxWords: number }> = {
  a2: { minSentences: 3, maxSentences: 5, maxWords: 45 },
  b1: { minSentences: 4, maxSentences: 6, maxWords: 65 },
  b2: { minSentences: 4, maxSentences: 7, maxWords: 85 },
};

/**
 * Words that would take a story somewhere this bank never goes (under-13s use
 * the app). Matched as word prefixes on the French. A blunt instrument on
 * purpose: a false positive just means rewording.
 */
export const BANNED_PREFIXES = [
  'guerre', 'arme', 'bombe', 'attentat', 'terror', 'meurtre', 'tue', 'mort', 'cadavre', 'crime',
  'criminel', 'voleur', 'police', 'prison', 'drogue', 'alcool', 'sexe', 'election', 'president',
  'ministre', 'gouvernement', 'parti politique', 'religion', 'seisme', 'inondation', 'catastroph', 'incendie',
  'accident', 'blesse', 'maladie', 'virus', 'pandemie', 'suicide',
];

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PIN_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
// Straight apostrophes only (content-authoring §13); no control characters (§12).
const CURLY_RE = /[‘’ʼ`´]/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

function levelText(level: NewsLevel): string {
  return level.sentences.map(s => s.fr).join(' ');
}

function lintLevel(id: NewsLevelId, level: NewsLevel | undefined, push: (i: Omit<NewsLintIssue, 'editionId'>) => void) {
  const err = (code: string, message: string) => push({ severity: 'error', level: id, code, message });
  if (!level) {
    err('missing-level', `level ${id} is missing`);
    return;
  }
  const limits = LEVEL_LIMITS[id];
  const text = levelText(level);
  const n = level.sentences.length;

  if (!level.headline.trim()) err('headline', 'headline is empty');
  if (n < limits.minSentences || n > limits.maxSentences) {
    err('sentence-count', `${n} sentences; ${id} needs ${limits.minSentences}–${limits.maxSentences}`);
  }
  const words = wordCount(text);
  if (words > limits.maxWords) err('too-long', `${words} words; ${id} allows ${limits.maxWords}`);
  level.sentences.forEach((s, i) => {
    if (!s.fr.trim() || !s.en.trim()) err('sentence-empty', `sentence ${i} has an empty fr or en`);
  });

  const allFrench = [level.headline, text, level.opinion.fr, level.modelRetell, ...level.starters, ...level.glossary.map(g => g.fr)];
  for (const fr of allFrench) {
    if (CURLY_RE.test(fr)) err('curly-apostrophe', `use straight ' in « ${fr.slice(0, 40)} »`);
    if (CONTROL_RE.test(fr)) err('control-character', `control character in « ${fr.slice(0, 40)} »`);
  }
  const normalizedAll = ` ${allFrench.join(' ').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z ]+/g, ' ')} `;
  for (const p of BANNED_PREFIXES) {
    if (normalizedAll.includes(` ${p}`)) err('banned-topic', `contains « ${p.trim()} »`);
  }

  if (level.glossary.length < 3 || level.glossary.length > 8) err('glossary-count', `${level.glossary.length} glossary entries; needs 3–8`);
  for (const g of level.glossary) {
    if (!cueOccurs(text, g.fr)) err('glossary-not-in-text', `glossary « ${g.fr} » is not in the story`);
  }

  if (level.facts.length < 3 || level.facts.length > 4) err('fact-count', `${level.facts.length} facts; needs 3–4`);
  const factIds = new Set<string>();
  for (const f of level.facts) {
    if (factIds.has(f.id)) err('fact-id-duplicate', `fact id ${f.id} repeats`);
    factIds.add(f.id);
    if (f.cues.length < 2) err('fact-cues', `fact ${f.id} needs at least 2 cue groups (one keyword must never cover a fact)`);
    if (f.sentence < 0 || f.sentence >= n) err('fact-sentence', `fact ${f.id} points at sentence ${f.sentence}`);
    f.cues.forEach((group, gi) => {
      if (group.length === 0) err('fact-cues', `fact ${f.id} group ${gi} is empty`);
      else if (!group.some(alt => cueOccurs(text, alt))) {
        err('fact-cue-not-in-text', `fact ${f.id} group ${gi} (${group.join(' / ')}) never occurs in the story`);
      }
    });
  }
  const retold = matchFacts(level.modelRetell, level.facts);
  if (retold.missed.length > 0) err('model-retell-misses', `modelRetell misses fact(s) ${retold.missed.join(', ')}`);

  if (level.check.length !== 3) err('check-count', `${level.check.length} check questions; needs 3`);
  level.check.forEach((c, i) => {
    if (c.options.length < 2 || c.options.length > 4) err('check-options', `check ${i} has ${c.options.length} options; needs 2–4`);
    if (c.answer < 0 || c.answer >= c.options.length) err('check-answer', `check ${i} answer ${c.answer} is out of range`);
    if (c.sentence < 0 || c.sentence >= n) err('check-sentence', `check ${i} points at sentence ${c.sentence}`);
    if (new Set(c.options).size !== c.options.length) err('check-options', `check ${i} repeats an option`);
  });

  if (!level.opinion.fr.trim() || !level.opinion.en.trim()) err('opinion', 'opinion prompt is empty');
  if (level.starters.length < 2 || level.starters.length > 3) err('starters', `${level.starters.length} starters; needs 2–3`);
}

export function lintNewsBank(bank: readonly NewsEdition[]): NewsLintIssue[] {
  const issues: NewsLintIssue[] = [];
  const ids = new Set<string>();
  const pins = new Set<string>();
  for (const e of bank) {
    const push = (i: Omit<NewsLintIssue, 'editionId'>) => issues.push({ editionId: e.id, ...i });
    if (!ID_RE.test(e.id)) push({ severity: 'error', code: 'id-format', message: `id « ${e.id} » must be kebab-case` });
    if (ids.has(e.id)) push({ severity: 'error', code: 'id-duplicate', message: `id ${e.id} repeats` });
    ids.add(e.id);
    if (e.pinDate !== undefined) {
      if (!PIN_RE.test(e.pinDate)) push({ severity: 'error', code: 'pin-format', message: `pinDate ${e.pinDate} must be MM-DD` });
      if (pins.has(e.pinDate)) push({ severity: 'error', code: 'pin-duplicate', message: `two editions pinned to ${e.pinDate}` });
      pins.add(e.pinDate);
    }
    if (!e.reviewed) push({ severity: 'warning', code: 'unreviewed', message: 'French not yet checked by a French speaker' });
    for (const id of NEWS_LEVELS) lintLevel(id, e.levels[id], push);
  }
  if (bank.filter(e => !e.pinDate).length < 7) {
    issues.push({ severity: 'error', editionId: '*', code: 'rotation-too-small', message: 'fewer than 7 unpinned editions: a story would repeat within a week' });
  }
  return issues;
}

/**
 * Deterministic lint over the Daily News bank — docs/systems/daily-news.md §1 and §7.
 * Run by `src/data/news/__tests__/newsBankLint.test.ts` (errors fail the suite),
 * never at runtime. Modelled on src/data/learnBankLint.ts: rules the data
 * contract states are errors; `unreviewed` is a warning, because the real check
 * on the French is a human one (content-authoring §16).
 */
import { phraseOccurs } from '../../features/news/newsMatch';
import { TOPICS } from '../topics';
import {
  NEWS_LEVELS,
  type NewsEdition,
  type NewsEditionSegments,
  type NewsLevel,
  type NewsLevelId,
  type NewsStory,
} from './types';

export type NewsLintSeverity = 'error' | 'warning';

export interface NewsLintIssue {
  severity: NewsLintSeverity;
  editionId: string;
  level?: NewsLevelId;
  code: string;
  message: string;
}

/** Per level: sentence count range and the word ceiling for the whole story. */
export const LEVEL_LIMITS: Record<NewsLevelId, { minSentences: number; maxSentences: number; maxWords: number; maxModelWords: number }> = {
  a2: { minSentences: 3, maxSentences: 5, maxWords: 45, maxModelWords: 30 },
  b1: { minSentences: 4, maxSentences: 6, maxWords: 65, maxModelWords: 40 },
  b2: { minSentences: 4, maxSentences: 7, maxWords: 85, maxModelWords: 50 },
};

const EXAM_AREAS = new Set(['A', 'B', 'C', 'D', 'E']);
const CORE_TOPICS = new Set(TOPICS.filter(t => !t.isAdvanced).map(t => t.key));

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

  const allFrench = [
    level.headline,
    text,
    ...level.glossary.map(g => g.fr),
    level.fake.fr,
    level.interview.role.fr,
    ...level.interview.questions.flatMap(q => [q.fr, q.model, ...q.starters]),
    level.debate.motion.fr,
    level.debate.for.model,
    level.debate.against.model,
    ...level.debate.for.starters,
    ...level.debate.against.starters,
  ];
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
    if (!phraseOccurs(text, g.fr)) err('glossary-not-in-text', `glossary « ${g.fr} » is not in the story`);
  }

  if (level.check.length !== 3) err('check-count', `${level.check.length} check questions; needs 3`);
  level.check.forEach((c, i) => {
    if (c.options.length < 2 || c.options.length > 4) err('check-options', `check ${i} has ${c.options.length} options; needs 2–4`);
    if (c.answer < 0 || c.answer >= c.options.length) err('check-answer', `check ${i} answer ${c.answer} is out of range`);
    if (c.sentence < 0 || c.sentence >= n) err('check-sentence', `check ${i} points at sentence ${c.sentence}`);
    if (new Set(c.options).size !== c.options.length) err('check-options', `check ${i} repeats an option`);
  });

  lintSegments(id, level, err);
}

function nonEmpty(...xs: string[]): boolean {
  return xs.every(x => x.trim().length > 0);
}

function startersOk(starters: readonly string[]): boolean {
  return starters.length >= 2 && starters.length <= 3 && starters.every(x => x.trim().length > 0);
}

/** The show's segments for one level (daily-news §7). */
function lintSegments(id: NewsLevelId, level: NewsLevel, err: (code: string, message: string) => void) {
  const n = level.sentences.length;
  const maxModel = LEVEL_LIMITS[id].maxModelWords;

  const { fake } = level;
  if (fake.sentence < 0 || fake.sentence >= n) err('fake-sentence', `fake points at sentence ${fake.sentence}`);
  else if (fake.fr.trim() === level.sentences[fake.sentence].fr.trim()) err('fake-unchanged', 'fake sentence is the same as the real one');
  if (!nonEmpty(fake.fr, fake.en)) err('fake-empty', 'fake fr/en is empty');
  if (fake.options.length !== 3 || new Set(fake.options).size !== 3 || !nonEmpty(...fake.options)) {
    err('fake-options', 'fake needs 3 different, non-empty options');
  }
  if (fake.answer < 0 || fake.answer >= fake.options.length) err('fake-answer', `fake answer ${fake.answer} is out of range`);

  const { interview } = level;
  if (!nonEmpty(interview.role.fr, interview.role.en)) err('interview-role', 'interview role is empty');
  if (interview.questions.length !== 3) err('interview-count', `${interview.questions.length} interview questions; needs 3`);
  interview.questions.forEach((q, i) => {
    if (!nonEmpty(q.fr, q.en, q.model)) err('interview-empty', `interview question ${i} has an empty field`);
    // A question, or an imperative prompt (« Racontez-nous… »).
    if (!/[?.]$/.test(q.fr.trim())) err('interview-question-mark', `interview prompt ${i} must end with « ? » (or « . » for « Racontez-nous… »)`);
    if (!startersOk(q.starters)) err('interview-starters', `interview question ${i} needs 2–3 starters`);
    if (wordCount(q.model) > maxModel) err('model-too-long', `interview model ${i}: ${wordCount(q.model)} words; ${id} allows ${maxModel}`);
  });
  const kinds = new Set(interview.questions.map(q => q.kind));
  if (!kinds.has('past')) err('interview-tenses', 'the interview needs a question in the past');
  if (id !== 'a2' && !kinds.has('future')) err('interview-tenses', `a ${id} interview needs a question about the future`);

  const { debate } = level;
  if (!nonEmpty(debate.motion.fr, debate.motion.en)) err('debate-motion', 'debate motion is empty');
  if (!debate.motion.fr.trim().endsWith('?')) err('debate-motion', 'debate motion must be a question ending with « ? »');
  for (const [side, d] of [['for', debate.for], ['against', debate.against]] as const) {
    if (!startersOk(d.starters)) err('debate-starters', `debate ${side} needs 2–3 starters`);
    if (!nonEmpty(d.model)) err('debate-model', `debate ${side} model is empty`);
    if (wordCount(d.model) > maxModel) err('model-too-long', `debate ${side} model: ${wordCount(d.model)} words; ${id} allows ${maxModel}`);
  }
}

/** Every story needs its segments, and every segments entry its story. */
export function lintSegmentCoverage(stories: readonly NewsStory[], segments: Readonly<Record<string, NewsEditionSegments>>): NewsLintIssue[] {
  const issues: NewsLintIssue[] = [];
  const ids = new Set(stories.map(s => s.id));
  for (const s of stories) {
    if (!segments[s.id]) issues.push({ severity: 'error', editionId: s.id, code: 'missing-segments', message: 'story has no segments entry (segments/*.ts)' });
  }
  for (const id of Object.keys(segments)) {
    if (!ids.has(id)) issues.push({ severity: 'error', editionId: id, code: 'orphan-segments', message: 'segments entry has no story' });
  }
  return issues;
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
    if (!EXAM_AREAS.has(e.examArea)) push({ severity: 'error', code: 'exam-area', message: `examArea ${e.examArea} must be A–E` });
    if (e.learnTopic !== undefined && !CORE_TOPICS.has(e.learnTopic)) {
      push({ severity: 'error', code: 'learn-topic', message: `learnTopic ${e.learnTopic} is not a core Learn topic` });
    }
    for (const id of NEWS_LEVELS) lintLevel(id, e.levels[id], push);
  }
  if (bank.filter(e => !e.pinDate).length < 7) {
    issues.push({ severity: 'error', editionId: '*', code: 'rotation-too-small', message: 'fewer than 7 unpinned editions: a story would repeat within a week' });
  }
  return issues;
}

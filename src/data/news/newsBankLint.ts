/**
 * Deterministic lint over the Daily News bank — docs/systems/daily-news.md §1 and §7.
 * Run by `src/data/news/__tests__/newsBankLint.test.ts` (errors fail the suite),
 * never at runtime. Modelled on src/data/learnBankLint.ts: rules the data
 * contract states are errors; `unreviewed` is a warning, because the real check
 * on the French is a human one (content-authoring §16).
 */
import { phraseOccurs } from '../../features/news/newsMatch';
import { checkJournalistQuestion } from '../../features/news/show/journalistCheck';
import { factUsed, showsHabit, type Habit } from '../../features/news/show/answerReview';
import { TOPICS } from '../topics';
import {
  NEWS_LEVELS,
  type NewsEdition,
  type NewsEditionSegments,
  type NewsLevel,
  type NewsLevelId,
  type NewsReporterSegments,
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
    ...level.interview.questions.flatMap(q => [q.fr, q.model, ...q.starters, ...(q.reaction ? [q.reaction.fr] : [])]),
    ...(level.interview.factSheet ?? []).flatMap(f => [f.note, ...f.keywords]),
    level.debate.motion.fr,
    level.debate.for.model,
    level.debate.against.model,
    ...level.debate.for.starters,
    ...level.debate.against.starters,
    ...level.journalist.targets.flatMap(t => [t.question, t.answer.fr]),
    ...[level.predict.next, level.predict.ifYou].flatMap(t => [t.fr, t.model, ...t.starters]),
    level.predict.henri.fr,
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

/** An interview with a fact sheet has this many questions (daily-news §7). */
export const FACT_SHEET_QUESTIONS = 5;

const HABIT_OF: Partial<Record<string, Habit>> = { past: 'past', future: 'future', opinion: 'reason' };

/**
 * L'interview's fact sheet (daily-news §7): 8–10 facts, at least three
 * questions that each need one (and whose model uses it), a last question that
 * asks the learner's own view, and Henri's short line after every answer.
 * Each model answer must pass the very checks the learner's answer gets.
 */
function lintFactSheet(level: NewsLevel, err: (code: string, message: string) => void) {
  const { factSheet: sheet, questions } = level.interview;
  if (!sheet) {
    if (questions.some(q => q.fact || q.reaction)) err('fact-without-sheet', 'interview questions name facts or reactions but there is no fact sheet');
    return;
  }
  if (sheet.length < 8 || sheet.length > 10) err('fact-sheet-count', `${sheet.length} facts; a fact sheet needs 8–10`);
  const ids = new Set<string>();
  sheet.forEach((f, i) => {
    if (!ID_RE.test(f.id)) err('fact-id', `fact ${i} id « ${f.id} » must be kebab-case`);
    if (ids.has(f.id)) err('fact-id', `fact id ${f.id} repeats`);
    ids.add(f.id);
    if (!nonEmpty(f.label, f.note)) err('fact-empty', `fact ${f.id} has an empty label or note`);
    if (f.keywords.length === 0 || !nonEmpty(...f.keywords)) err('fact-keywords', `fact ${f.id} needs at least one keyword`);
  });
  const bound = questions.filter(q => q.fact);
  if (bound.length < 3) err('fact-questions', `${bound.length} questions use the fact sheet; needs at least 3`);
  const last = questions[questions.length - 1];
  if (last && (last.fact || last.kind !== 'opinion')) err('fact-last-question', "the last question asks the learner's own view: kind 'opinion', no fact");
  questions.forEach((q, i) => {
    if (!q.reaction || !nonEmpty(q.reaction.fr, q.reaction.en)) err('fact-reaction', `question ${i} needs Henri's reaction`);
    else if (wordCount(q.reaction.fr) > 10) err('fact-reaction', `question ${i}: Henri's reaction is ${wordCount(q.reaction.fr)} words; keep it to 10`);
    if (q.fact) {
      const fact = sheet.find(f => f.id === q.fact);
      if (!fact) err('fact-unknown', `question ${i} needs fact « ${q.fact} », which is not on the sheet`);
      else if (!factUsed(fact, q.model)) err('fact-not-in-model', `question ${i}'s model does not use fact « ${fact.id} » (no keyword heard)`);
    }
    const habit = HABIT_OF[q.kind];
    if (habit && !showsHabit(habit, q.model)) err('model-habit', `question ${i} (${q.kind}) model does not show ${habit === 'reason' ? 'a reason' : `the ${habit}`}`);
  });
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
  const wanted = interview.factSheet ? FACT_SHEET_QUESTIONS : 3;
  if (interview.questions.length !== wanted) {
    err('interview-count', `${interview.questions.length} interview questions; needs ${wanted}${interview.factSheet ? ' with a fact sheet' : ''}`);
  }
  lintFactSheet(level, err);
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

  // « Le journaliste, c'est toi »: three goals, three different question words,
  // and each model question must pass the very check the learner faces.
  const { targets } = level.journalist;
  if (targets.length !== 3) err('journalist-count', `${targets.length} journalist goals; needs 3`);
  if (new Set(targets.map(t => t.word)).size !== targets.length) err('journalist-words', 'journalist goals must each need a different question word');
  targets.forEach((t, i) => {
    if (!nonEmpty(t.goal, t.question, t.answer.fr, t.answer.en)) err('journalist-empty', `journalist goal ${i} has an empty field`);
    if (!t.question.trim().endsWith('?')) err('journalist-question-mark', `journalist model question ${i} must end with « ? »`);
    if (checkJournalistQuestion(t.question, t.word).verdict !== 'right') {
      err('journalist-word', `journalist model question ${i} « ${t.question} » is not heard as « ${t.word} »`);
    }
    if (wordCount(t.answer.fr) > maxModel) err('model-too-long', `journalist answer ${i}: ${wordCount(t.answer.fr)} words; ${id} allows ${maxModel}`);
  });

  // « Et après ? »: two prompts and Henri's own guess.
  const { predict } = level;
  for (const [name, t] of [['next', predict.next], ['ifYou', predict.ifYou]] as const) {
    if (!nonEmpty(t.fr, t.en, t.model)) err('predict-empty', `predict ${name} has an empty field`);
    if (!t.fr.trim().endsWith('?')) err('predict-question-mark', `predict ${name} must end with « ? »`);
    if (!startersOk(t.starters)) err('predict-starters', `predict ${name} needs 2–3 starters`);
    if (wordCount(t.model) > maxModel) err('model-too-long', `predict ${name} model: ${wordCount(t.model)} words; ${id} allows ${maxModel}`);
  }
  if (!nonEmpty(predict.henri.fr, predict.henri.en)) err('predict-henri', "Henri's prediction is empty");
  else if (!predict.henri.fr.startsWith('Moi, je pense que') && !predict.henri.fr.startsWith("Moi, je pense qu'")) {
    err('predict-henri', "Henri's prediction must read as his guess: start with « Moi, je pense que… »");
  }
}

/** Every story needs its segments (both sets), and every segments entry its story. */
export function lintSegmentCoverage(
  stories: readonly NewsStory[],
  segments: Readonly<Record<string, NewsEditionSegments>>,
  reporter?: Readonly<Record<string, NewsReporterSegments>>,
): NewsLintIssue[] {
  const issues: NewsLintIssue[] = [];
  const ids = new Set(stories.map(s => s.id));
  for (const s of stories) {
    if (!segments[s.id]) issues.push({ severity: 'error', editionId: s.id, code: 'missing-segments', message: 'story has no segments entry (segments/week*.ts)' });
    if (reporter && !reporter[s.id]) issues.push({ severity: 'error', editionId: s.id, code: 'missing-reporter', message: 'story has no journalist/predict entry (segments/reporter*.ts)' });
  }
  for (const id of [...Object.keys(segments), ...Object.keys(reporter ?? {})]) {
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

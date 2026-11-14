import { DETECTIVE_BANK } from '../../data/questionWords/bank';
import { ANSWER_TYPES, WORD_IDS, type AnswerType, type DetectiveQuestion, type WordId } from '../../data/questionWords/types';
import { classifyAnswer, knownAnswersOfType } from './answerType';
import { parseMixupKey } from './judge';
import { rungOf, type LadderMap } from './ladder';
import { pickIndex, shuffle } from './rng';

export const ROUND_SIZE = 8;

export interface RoundItem {
  question: DetectiveQuestion;
  /** Three choices on the tap rung: the model plus two other-type answers. */
  choices: string[];
}

export interface RoundPlan {
  items: RoundItem[];
  filter: WordId[] | null;
}

export function parseWordFilter(raw: string | null): WordId[] | null {
  if (!raw) return null;
  const wanted = raw.split(',').map(s => s.trim()).filter(Boolean);
  const ids = wanted.filter((id): id is WordId => (WORD_IDS as readonly string[]).includes(id));
  return ids.length ? ids : null;
}

function poolFor(filter: WordId[] | null): DetectiveQuestion[] {
  if (!filter) return [...DETECTIVE_BANK];
  const set = new Set(filter);
  return DETECTIVE_BANK.filter(q => set.has(q.wordId));
}

function weightOf(q: DetectiveQuestion, ladder: LadderMap, mixups: Record<string, number>, seen: Set<string>): number {
  let w = 1;
  const rung = rungOf(ladder, q.wordId);
  if (rung === 'tap') w += 1;
  if ((ladder[q.wordId]?.streak ?? 0) === 0) w += 1;
  if (!seen.has(q.id)) w += 2;
  for (const [key, n] of Object.entries(mixups)) {
    const parsed = parseMixupKey(key);
    if (parsed && (parsed.expected === q.wordId || parsed.given === q.wordId)) w += n;
  }
  return w;
}

function pickWeighted(pool: DetectiveQuestion[], rand: () => number, ladder: LadderMap, mixups: Record<string, number>, seen: Set<string>): DetectiveQuestion {
  const weights = pool.map(q => weightOf(q, ladder, mixups, seen));
  const total = weights.reduce((a, b) => a + b, 0);
  let tick = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    tick -= weights[i];
    if (tick <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Quel answers are often people (« Hugo », « Léa »), so they must not appear
 * as tap distractors on a qui question — the wrong choices have to look like
 * a different kind of thing, not another name.
 */
function tapAvoidTypes(type: AnswerType): Set<AnswerType> {
  const avoid = new Set<AnswerType>([type]);
  if (type === 'person') avoid.add('choice');
  if (type === 'choice') avoid.add('person');
  return avoid;
}

function distractors(question: DetectiveQuestion, rand: () => number): string[] {
  const avoid = tapAvoidTypes(question.answerType);
  const types = shuffle(ANSWER_TYPES.filter(t => !avoid.has(t)), rand);
  const picked: string[] = [];
  for (const type of types) {
    const extras = knownAnswersOfType(type).filter(a => classifyAnswer(a) === type);
    if (extras.length === 0) continue;
    picked.push(extras[pickIndex(rand, extras.length)]);
    if (picked.length === 2) break;
  }
  return picked;
}

export function buildRound(
  rand: () => number,
  opts: { ladder: LadderMap; mixups: Record<string, number>; filter?: WordId[] | null; size?: number } = { ladder: {} as LadderMap, mixups: {} },
): RoundPlan {
  const filter = opts.filter ?? null;
  const size = opts.size ?? ROUND_SIZE;
  const all = poolFor(filter);
  const items: RoundItem[] = [];
  const used = new Set<string>();
  const usedWords: WordId[] = [];

  for (let n = 0; n < size && used.size < all.length; n++) {
    let remaining = all.filter(q => !used.has(q.id));
    const unusedWord = remaining.filter(q => !usedWords.includes(q.wordId));
    if (unusedWord.length) remaining = unusedWord;
    const question = pickWeighted(remaining, rand, opts.ladder, opts.mixups, used);
    used.add(question.id);
    usedWords.push(question.wordId);
    const extra = distractors(question, rand);
    const choices = shuffle([question.model, ...extra], rand);
    items.push({ question, choices });
  }

  return { items, filter };
}

export function buildTrickyRound(
  rand: () => number,
  mixups: Record<string, number>,
  ladder: LadderMap,
): RoundPlan | null {
  const ranked = Object.entries(mixups)
    .map(([key, n]) => ({ key, n, parsed: parseMixupKey(key) }))
    .filter(r => r.parsed && r.n > 0)
    .sort((a, b) => b.n - a.n);
  const words = [...new Set(ranked.slice(0, 2).flatMap(r => (r.parsed ? [r.parsed.expected, r.parsed.given] : [])))];
  if (words.length < 2) return null;
  return buildRound(rand, { ladder, mixups, filter: words, size: ROUND_SIZE });
}

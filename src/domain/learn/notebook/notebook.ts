/**
 * Your exam notebook (Learn feedback Batch 6d), the pure half.
 *
 * 0520 topic conversations are about the learner's own life, so a "Say it
 * better" answer is their own story in correct A2–B1 French. The notebook keeps
 * one such version per question, as material to ADAPT — never a script to
 * memorise.
 *
 *  - One entry per question. Saving a different answer for the same question
 *    replaces it and moves the old one into a short `history`; saving the same
 *    answer again is a no-op.
 *  - `phrases` are the learner's own strengths (quotes from the Coach
 *    `strengths[]`) that are still in the saved answer word for word, so Recall
 *    mode can blank them. A strength the improved answer reworded is dropped
 *    here rather than half-blanked.
 *  - Local only. Nothing here is a Session, evidence, XP or analytics, and it
 *    must never reach a sync module, a request body or a log (see the guard
 *    test in `__tests__/notebookPrivacy.test.ts`).
 *
 * Pure: no storage, no React, no clock (the caller passes `now`).
 */
import { compareRetake } from '../feedback/compareRetake';

/** How many replaced versions an entry keeps. */
export const NOTEBOOK_HISTORY_CAP = 5;

export interface NotebookVersion {
  answer: string;
  phrases: string[];
  savedAt: string;
}

export interface NotebookEntry extends NotebookVersion {
  questionId: string;
  question: string;
  topicKey: string;
  subTopic?: string;
  /** Earlier versions of this question's answer, newest first. */
  history: NotebookVersion[];
}

/** What the feedback screen hands the reducer: an entry before it is dated or merged. */
export interface NotebookDraft {
  questionId: string;
  question: string;
  topicKey: string;
  subTopic?: string;
  answer: string;
  phrases: string[];
}

/** What the feedback screen needs to know about the question being answered. */
export interface NotebookQuestionRef {
  questionId: string;
  question: string;
  topicKey: string;
  subTopic?: string;
}

const APOSTROPHES = /[‘’´`]/g;

/** Case- and apostrophe-folded copy of the same length, so indexes carry back to the original. */
function fold(text: string): string {
  return text.replace(APOSTROPHES, "'").toLowerCase();
}

const LETTER = /[\p{L}\p{N}]/u;

function isWordEdge(text: string, index: number): boolean {
  const ch = text[index];
  return ch === undefined || !LETTER.test(ch);
}

/** Where `phrase` sits in `answer` as whole words (case/apostrophe-insensitive), or null. */
function locate(answer: string, phrase: string): { start: number; end: number } | null {
  const needle = fold(phrase.trim().replace(/[\s.,;:!?…]+$/u, ''));
  if (!needle) return null;
  const hay = fold(answer);
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1) return null;
    const end = at + needle.length;
    if (isWordEdge(hay, at - 1) && isWordEdge(hay, end)) return { start: at, end };
    from = at + 1;
  }
}

/** The learner's own strength quotes from a Coach feedback: every strength, else the single best moment. */
export function strengthQuotes(feedback: { strengths?: ReadonlyArray<{ quote: string }>; best_moment?: string }): string[] {
  const fromList = (feedback.strengths ?? []).map((s) => s.quote).filter((q) => q.trim());
  if (fromList.length > 0) return fromList;
  return feedback.best_moment?.trim() ? [feedback.best_moment] : [];
}

/**
 * The strengths worth blanking: those still in the saved answer as whole words,
 * deduplicated, in the order they appear in the answer. Overlapping phrases keep
 * the earlier one.
 */
export function keyPhrases(answer: string, strengthQuotes: readonly string[]): string[] {
  const found: Array<{ start: number; end: number; phrase: string }> = [];
  const seen = new Set<string>();
  for (const q of strengthQuotes) {
    const phrase = q.trim();
    if (!phrase || seen.has(fold(phrase))) continue;
    const at = locate(answer, phrase);
    if (!at) continue;
    seen.add(fold(phrase));
    found.push({ ...at, phrase });
  }
  found.sort((a, b) => a.start - b.start);
  const kept: typeof found = [];
  for (const f of found) {
    const last = kept[kept.length - 1];
    if (!last || f.start >= last.end) kept.push(f);
  }
  return kept.map((f) => f.phrase);
}

export type RecallSegment = { kind: 'text'; text: string } | { kind: 'blank'; phrase: string };

/** The answer split into plain text and blanks (one per key phrase that is in it). */
export function blankPhrases(answer: string, phrases: readonly string[]): RecallSegment[] {
  const spans: Array<{ start: number; end: number; phrase: string }> = [];
  for (const phrase of phrases) {
    const at = locate(answer, phrase);
    if (at) spans.push({ ...at, phrase });
  }
  spans.sort((a, b) => a.start - b.start);
  const segments: RecallSegment[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    if (s.start > cursor) segments.push({ kind: 'text', text: answer.slice(cursor, s.start) });
    segments.push({ kind: 'blank', phrase: answer.slice(s.start, s.end) });
    cursor = s.end;
  }
  if (cursor < answer.length) segments.push({ kind: 'text', text: answer.slice(cursor) });
  return segments;
}

export interface RecallResult {
  /** Nothing usable was heard: the caller offers another go, with no verdict. */
  empty: boolean;
  /** Key phrases the learner said again. */
  recalled: string[];
  /** The rest — neutral ("not in this take"), because speech recognition and paraphrase prove nothing either way. */
  notHeard: string[];
}

/** Recall mode's check: the same logic as the Second take, over the key phrases only. */
export function recallCheck(phrases: readonly string[], transcript: string): RecallResult {
  const r = compareRetake([], phrases, transcript);
  if (r.empty) return { empty: true, recalled: [], notHeard: [...phrases] };
  return { empty: false, recalled: r.kept, notHeard: phrases.filter((p) => !r.kept.includes(p)) };
}

/** The same words, ignoring case, apostrophe style and spacing. */
export function isSameAnswer(a: string, b: string): boolean {
  return fold(a).replace(/\s+/g, ' ').trim() === fold(b).replace(/\s+/g, ' ').trim();
}

/**
 * Save a draft: a new question adds an entry (newest first); a known question
 * with a different answer replaces its entry and files the old version under
 * `history`; the same answer again returns `entries` unchanged (same reference).
 */
export function upsertEntry(entries: readonly NotebookEntry[], draft: NotebookDraft, now: string): NotebookEntry[] {
  const answer = draft.answer.trim();
  if (!answer || !draft.questionId) return entries as NotebookEntry[];
  const existing = entries.find((e) => e.questionId === draft.questionId);
  if (existing && isSameAnswer(existing.answer, answer)) return entries as NotebookEntry[];

  const entry: NotebookEntry = {
    questionId: draft.questionId,
    question: draft.question,
    topicKey: draft.topicKey,
    ...(draft.subTopic ? { subTopic: draft.subTopic } : {}),
    answer,
    phrases: draft.phrases,
    savedAt: now,
    history: existing
      ? [{ answer: existing.answer, phrases: existing.phrases, savedAt: existing.savedAt }, ...existing.history].slice(0, NOTEBOOK_HISTORY_CAP)
      : [],
  };
  return [entry, ...entries.filter((e) => e.questionId !== draft.questionId)];
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

function parseVersion(v: unknown): NotebookVersion | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!isString(o.answer) || !o.answer.trim() || !isString(o.savedAt)) return null;
  return { answer: o.answer, phrases: isStringArray(o.phrases) ? o.phrases : [], savedAt: o.savedAt };
}

/** A stored value read back defensively: anything malformed is dropped, never thrown on. */
export function parseNotebook(raw: unknown): NotebookEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: NotebookEntry[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const version = parseVersion(o);
    if (!version || !isString(o.questionId) || !o.questionId || ids.has(o.questionId)) continue;
    if (!isString(o.question) || !isString(o.topicKey)) continue;
    ids.add(o.questionId);
    out.push({
      questionId: o.questionId,
      question: o.question,
      topicKey: o.topicKey,
      ...(isString(o.subTopic) && o.subTopic ? { subTopic: o.subTopic } : {}),
      ...version,
      history: (Array.isArray(o.history) ? o.history : [])
        .map(parseVersion)
        .filter((v): v is NotebookVersion => v !== null)
        .slice(0, NOTEBOOK_HISTORY_CAP),
    });
  }
  return out;
}

export interface NotebookGroup {
  topicKey: string;
  /** `null` for entries without a sub-topic. */
  subTopics: Array<{ subTopic: string | null; entries: NotebookEntry[] }>;
}

/**
 * Entries grouped by topic, then sub-topic. Topics follow `topicOrder` (unknown
 * keys last); sub-topics follow `subTopicOrder(topicKey)` with "no sub-topic"
 * last; entries stay newest first.
 */
export function groupNotebook(
  entries: readonly NotebookEntry[],
  topicOrder: readonly string[],
  subTopicOrder: (topicKey: string) => readonly string[],
): NotebookGroup[] {
  const byTopic = new Map<string, NotebookEntry[]>();
  for (const e of entries) byTopic.set(e.topicKey, [...(byTopic.get(e.topicKey) ?? []), e]);
  const rank = (list: readonly string[], key: string) => {
    const i = list.indexOf(key);
    return i === -1 ? list.length : i;
  };
  return [...byTopic.keys()]
    .sort((a, b) => rank(topicOrder, a) - rank(topicOrder, b))
    .map((topicKey) => {
      const list = byTopic.get(topicKey) ?? [];
      const order = subTopicOrder(topicKey);
      const subs = new Map<string | null, NotebookEntry[]>();
      for (const e of list) subs.set(e.subTopic ?? null, [...(subs.get(e.subTopic ?? null) ?? []), e]);
      const keys = [...subs.keys()].sort((a, b) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return rank(order, a) - rank(order, b);
      });
      return { topicKey, subTopics: keys.map((subTopic) => ({ subTopic, entries: subs.get(subTopic) ?? [] })) };
    });
}

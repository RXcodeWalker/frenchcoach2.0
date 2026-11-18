// ── Shareable progress cards: the data behind each image ─────────────────────
//
// Three cards a learner can post: a streak card, a "my best answer" card and an
// exam-countdown card. This module is pure — it turns what the app already knows
// (streak, session history, exam date) into a `ShareCardModel`; `renderShareCard`
// paints that model onto a canvas and `shareCardActions` hands the PNG to the
// phone's share sheet. Nothing here reads or writes app state.
//
// Honesty rules:
//  · a card is built only from real data — no streak, no streak card;
//  · a best-answer score is the Exam-standard `Session.score` and says so
//    (Learn's marking level never changes it);
//  · no card claims a grade or a predicted result.

import { SITE_URL } from '../../config/site';
import { localDay, localDayBefore, localDayOf } from '../../lib/localDay';
import { tidyAnswer } from '../../domain/transcription/tidyAnswer';

export type ShareCardKind = 'streak' | 'best_answer' | 'exam_countdown';

export const SHARE_CARD_KINDS: readonly ShareCardKind[] = ['streak', 'best_answer', 'exam_countdown'];

/** Which flat brand hue a card leans on. The renderer maps it to its fixed palette. */
export type ShareAccent = 'streak' | 'progress' | 'action' | 'reward';

export interface ShareWeekDot {
  /** Single-letter weekday label, e.g. "M". */
  label: string;
  practised: boolean;
  isToday: boolean;
}

export interface ShareCardModel {
  kind: ShareCardKind;
  accent: ShareAccent;
  /** Small uppercase line above the number, e.g. "DAY STREAK". */
  eyebrow: string;
  /** The big figure, e.g. "12" or "47". Empty on the best-answer card. */
  figure: string;
  /** Text under the figure, e.g. "days in a row". */
  figureLabel: string;
  /** Supporting sentences, in order. */
  lines: string[];
  /** The learner's own words (best-answer card only). */
  quote?: string;
  /** The question the quote answers (best-answer card only). */
  question?: string;
  /** Seven days ending today (streak card only). */
  week?: ShareWeekDot[];
  /** The line that asks a stranger to try it. */
  cta: string;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Host shown on the card, without scheme: "french.beyondthebasics.me". */
export function shareDisplayHost(): string {
  return SITE_URL.replace(/^https?:\/\//, '');
}

/** The link that travels with a card. utm_* is the only query the analytics keep (posthogClient). */
export function shareLink(kind: ShareCardKind): string {
  return `${SITE_URL}/?utm_source=share&utm_medium=card&utm_campaign=${kind}`;
}

// ── Streak ───────────────────────────────────────────────────────────────────

export interface StreakCardInput {
  streakDays: number;
  /** Local days (YYYY-MM-DD) the learner practised on, any length of history. */
  practisedDays: ReadonlySet<string>;
  now?: Date;
}

/** The set of local days the learner practised, from stored session dates. */
export function practisedDaySet(sessions: ReadonlyArray<{ date: string }>): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) {
    const d = localDayOf(s.date);
    if (d) days.add(d);
  }
  return days;
}

export function buildStreakCard({ streakDays, practisedDays, now = new Date() }: StreakCardInput): ShareCardModel | null {
  if (!Number.isFinite(streakDays) || streakDays < 1) return null;
  const today = localDay(now);
  const week: ShareWeekDot[] = [];
  for (let back = 6; back >= 0; back--) {
    const key = localDayBefore(back, now);
    const [y, m, d] = key.split('-').map(Number);
    const weekday = new Date(y, m - 1, d, 12).getDay();
    week.push({ label: WEEKDAY_LETTERS[weekday], practised: practisedDays.has(key), isToday: key === today });
  }
  const days = Math.floor(streakDays);
  return {
    kind: 'streak',
    accent: 'streak',
    eyebrow: 'Day streak',
    figure: String(days),
    figureLabel: days === 1 ? 'day of speaking French out loud' : 'days in a row speaking French out loud',
    lines: [streakMilestoneLine(days)],
    week,
    cta: 'Can you beat it? Practise speaking French free.',
  };
}

function streakMilestoneLine(days: number): string {
  if (days >= 100) return 'A hundred days of practice. That is real fluency in the making.';
  if (days >= 30) return 'A whole month without missing a day.';
  if (days >= 14) return 'Two weeks straight. The habit is built.';
  if (days >= 7) return 'A full week of practice. Every day counts.';
  if (days >= 3) return 'Three days and rolling. Keep it going.';
  return 'Day one is done. The streak starts here.';
}

// ── Best answer ──────────────────────────────────────────────────────────────

export interface BestAnswerSession {
  id: string;
  date: string;
  mode: string;
  questionText: string;
  transcript: string;
  score: number | null;
  wordCount: number;
}

/** An answer must score at least this (out of 10) to be worth a card — "best", not "latest". */
export const BEST_ANSWER_MIN_SCORE = 7;
/** …and be long enough to read as an answer, not a one-liner. */
export const BEST_ANSWER_MIN_WORDS = 12;
const QUOTE_MAX_CHARS = 190;
const QUESTION_MAX_CHARS = 110;

/**
 * The answers worth sharing, best first: Learn practice answers (never exams,
 * games or the news show — their scores mean something else) with a real
 * Exam-standard score of 7+ and enough words. Ties go to the newer answer.
 */
export function pickBestAnswers(sessions: ReadonlyArray<BestAnswerSession>, limit = 5): BestAnswerSession[] {
  return sessions
    .filter(s =>
      s.mode === 'practice'
      && typeof s.score === 'number' && Number.isFinite(s.score) && s.score >= BEST_ANSWER_MIN_SCORE
      && s.transcript.trim().length > 0
      && wordsOf(s.transcript) >= BEST_ANSWER_MIN_WORDS
      && s.questionText.trim().length > 0,
    )
    .sort((a, b) => (b.score as number) - (a.score as number) || b.date.localeCompare(a.date))
    .slice(0, limit);
}

function wordsOf(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** "9", "8.5" — never "9.0". */
export function formatScore(score: number): string {
  return String(Math.round(score * 10) / 10);
}

/**
 * The part of an answer that fits the card: whole sentences from the start while
 * they fit, else a word-boundary cut with an ellipsis. Keeps the learner's own
 * words exactly — only the end is trimmed.
 */
export function quoteExcerpt(transcript: string, maxChars = QUOTE_MAX_CHARS): string {
  const text = transcript.replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["»”)]*\s*/g);
  if (sentences) {
    let out = '';
    for (const s of sentences) {
      if ((out + s).trim().length > maxChars) break;
      out += s;
    }
    if (out.trim().length >= 40) return out.trim();
  }
  const cut = text.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:?.-]+$/, '')}…`;
}

export function buildBestAnswerCard(session: BestAnswerSession): ShareCardModel | null {
  if (typeof session.score !== 'number' || !Number.isFinite(session.score)) return null;
  const quote = quoteExcerpt(tidyAnswer(session.transcript));
  if (!quote) return null;
  return {
    kind: 'best_answer',
    accent: 'progress',
    eyebrow: 'My best answer',
    figure: '',
    figureLabel: '',
    lines: [`${formatScore(session.score)}/10 at exam standard`],
    quote,
    question: clip(session.questionText, QUESTION_MAX_CHARS),
    cta: 'Say it out loud and get feedback on every answer.',
  };
}

// ── Exam countdown ───────────────────────────────────────────────────────────

export interface ExamCountdownInput {
  /** Whole days left, as Profile shows them (`daysUntilExam`); null = no exam date. */
  daysLeft: number | null;
  /** The exam date, ISO. */
  examDate?: string;
  /** Speaking sessions practised so far (omit or 0 to leave the line out). */
  sessionsDone?: number;
  /** "Cambridge IGCSE French · 0520" etc.; omit when unknown. */
  examLabel?: string;
}

export function buildExamCountdownCard({ daysLeft, examDate, sessionsDone = 0, examLabel }: ExamCountdownInput): ShareCardModel | null {
  if (daysLeft === null || !Number.isFinite(daysLeft) || daysLeft < 0) return null;
  const days = Math.floor(daysLeft);
  const lines: string[] = [];
  if (examLabel) lines.push(`${examLabel} speaking exam`);
  const when = examDate ? formatExamDate(examDate) : null;
  if (when) lines.push(when);
  if (sessionsDone > 0) lines.push(`${sessionsDone} speaking session${sessionsDone === 1 ? '' : 's'} done so far`);
  return {
    kind: 'exam_countdown',
    accent: 'action',
    eyebrow: days === 0 ? 'Exam day' : 'Speaking exam in',
    figure: days === 0 ? 'Today' : String(days),
    figureLabel: days === 0 ? 'good luck!' : days === 1 ? 'day to go' : 'days to go',
    lines,
    cta: 'Practising out loud, every day. Join me.',
  };
}

function formatExamDate(iso: string): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Caption (the text posted with the image) ─────────────────────────────────

/** What goes next to the picture: one human line, then the link. */
export function shareCaption(model: ShareCardModel): string {
  const link = shareLink(model.kind);
  switch (model.kind) {
    case 'streak':
      return `${model.figure}-day streak speaking French out loud 🔥 Think you can beat it? ${link}`;
    case 'best_answer':
      return `My best French speaking answer so far — ${model.lines[0]}. Try it yourself: ${link}`;
    case 'exam_countdown':
      return model.figure === 'Today'
        ? `My French speaking exam is today! Wish me luck. ${link}`
        : `${model.figure} ${model.figureLabel} until my French speaking exam, and I'm practising out loud every day. ${link}`;
  }
}

/** File name for a saved card: french-coach-streak-2026-11-18.png */
export function shareFileName(kind: ShareCardKind, now: Date = new Date()): string {
  return `french-coach-${kind.replace('_', '-')}-${localDay(now)}.png`;
}

// ── Text layout (pure so it is testable without a canvas) ────────────────────

/**
 * Greedy word wrap. `measure` returns the pixel width of a string in the font
 * the caller has already set. A single word wider than `maxWidth` is placed on
 * its own line (the renderer lets it overflow rather than split a French word).
 * More than `maxLines` lines: the last kept line ends with an ellipsis.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (s: string) => number,
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const tryLine = line ? `${line} ${word}` : word;
    if (line && measure(tryLine) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = tryLine;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1].replace(/[\s,;:.-]+$/, '');
  while (last.includes(' ') && measure(`${last}…`) > maxWidth) last = last.slice(0, last.lastIndexOf(' '));
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

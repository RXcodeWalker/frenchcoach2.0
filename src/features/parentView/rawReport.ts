/**
 * The parent view's wire shape: what backend `get_parent_report(token)` returns
 * (migration 20261104090000). Parsed defensively — a malformed row is dropped,
 * never guessed at — because the page is opened by someone with no app state.
 *
 * Deliberately absent: transcripts, question text, recordings, saved answers. The RPC
 * never selects them; keep it that way (parentView.privacy.test.ts).
 */
import type { ExamAreaMarks } from '../../types';

export interface RawSession {
  at: string;
  mode: string;
  topic: string | null;
  /** /10 (Exam standard for Learn; an exam total rescaled /40 → /10). */
  score: number | null;
  durationSec: number;
  words: number;
  cefr: string | null;
  /** The coach's `biggest_opportunity` line, written to the learner. */
  nextStep: string | null;
  /** The coach's `best_moment` line, written to the learner (quotes their words). */
  highlight: string | null;
  /** Exam rows pushed after the parent view shipped; null = conditions not recorded. */
  exam: { practiceOnly: boolean; marks: ExamAreaMarks | null } | null;
}

export interface RawSpeaking {
  at: string;
  topic: string | null;
  wpm: number | null;
  startDelayS: number;
  pausesOver2s: number;
  longestPauseS: number;
  words: number;
  speakingS: number;
}

export interface RawParentReport {
  learnerName: string | null;
  linkLabel: string;
  generatedAt: string;
  sessions: RawSession[];
  speaking: RawSpeaking[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

function parseMarks(v: unknown): ExamAreaMarks | null {
  if (!isObj(v)) return null;
  const rolePlay = num(v.rolePlay);
  const rolePlayMax = num(v.rolePlayMax);
  const communication = num(v.communication);
  const qualityOfLanguage = num(v.qualityOfLanguage);
  const total = num(v.total);
  if (rolePlay === null || rolePlayMax === null || communication === null || qualityOfLanguage === null || total === null) return null;
  return { rolePlay, rolePlayMax, communication, qualityOfLanguage, total };
}

function parseSession(v: unknown): RawSession | null {
  if (!isObj(v) || !isDate(v.at) || typeof v.mode !== 'string') return null;
  const exam = isObj(v.exam) ? { practiceOnly: v.exam.practiceOnly === true, marks: parseMarks(v.exam.marks) } : null;
  return {
    at: v.at,
    mode: v.mode,
    topic: str(v.topic),
    score: num(v.score),
    durationSec: Math.max(0, num(v.durationSec) ?? 0),
    words: Math.max(0, num(v.words) ?? 0),
    cefr: str(v.cefr),
    nextStep: str(v.nextStep),
    highlight: str(v.highlight),
    exam,
  };
}

function parseSpeaking(v: unknown): RawSpeaking | null {
  if (!isObj(v) || !isDate(v.at)) return null;
  return {
    at: v.at,
    topic: str(v.topic),
    wpm: num(v.wpm),
    startDelayS: num(v.startDelayS) ?? 0,
    pausesOver2s: num(v.pausesOver2s) ?? 0,
    longestPauseS: num(v.longestPauseS) ?? 0,
    words: num(v.words) ?? 0,
    speakingS: num(v.speakingS) ?? 0,
  };
}

/** Returns null when the payload isn't a report at all. */
export function parseRawReport(v: unknown): RawParentReport | null {
  if (!isObj(v) || !Array.isArray(v.sessions) || !Array.isArray(v.speaking)) return null;
  return {
    learnerName: str(v.learnerName),
    linkLabel: typeof v.linkLabel === 'string' ? v.linkLabel : '',
    generatedAt: isDate(v.generatedAt) ? v.generatedAt : new Date().toISOString(),
    sessions: v.sessions.map(parseSession).filter((s): s is RawSession => s !== null),
    speaking: v.speaking.map(parseSpeaking).filter((s): s is RawSpeaking => s !== null),
  };
}

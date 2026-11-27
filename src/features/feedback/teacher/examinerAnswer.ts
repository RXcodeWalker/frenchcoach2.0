import type { ExaminerErrorItem } from '../../../services/coaching/examinerFeedback';

/**
 * Pure helpers over a Learn examiner reply and the learner's own answer, for
 * the Examiner style's overview and Breakdown (redesign 2026-11-27). They only
 * place what the reply already holds; they never add a verdict, and nothing
 * here is a mark.
 */

export interface PlacedError {
  start: number;
  end: number;
  error: ExaminerErrorItem;
}

/**
 * Where each mistake's quote sits in the answer, in reading order. A quote that
 * cannot be found, or that overlaps one already placed, is left out (never moved).
 */
export function placeErrors(transcript: string, errors: readonly ExaminerErrorItem[]): PlacedError[] {
  const text = transcript.normalize('NFC');
  const lower = text.toLowerCase();
  const placed: PlacedError[] = [];
  for (const error of errors) {
    const quote = error.quote.normalize('NFC').trim();
    if (!quote) continue;
    let from = 0;
    let found = -1;
    // The first occurrence not already covered by another mistake.
    while (from <= lower.length) {
      const i = lower.indexOf(quote.toLowerCase(), from);
      if (i < 0) break;
      const end = i + quote.length;
      if (!placed.some((p) => i < p.end && end > p.start)) {
        found = i;
        break;
      }
      from = i + 1;
    }
    if (found >= 0) placed.push({ start: found, end: found + quote.length, error });
  }
  return placed.sort((a, b) => a.start - b.start);
}

/**
 * The answer with every correction applied, for "How it sounded" to play and
 * practise. Null when any mistake cannot be placed — a half-corrected answer
 * would be played to the learner as if it were right.
 */
export function correctedAnswer(transcript: string, errors: readonly ExaminerErrorItem[]): string | null {
  const text = transcript.normalize('NFC').trim();
  if (!text) return null;
  const placed = placeErrors(text, errors);
  if (placed.length !== errors.filter((e) => e.quote.trim()).length) return null;
  let out = '';
  let cursor = 0;
  for (const p of placed) {
    out += text.slice(cursor, p.start) + p.error.correction.normalize('NFC');
    cursor = p.end;
  }
  return out + text.slice(cursor);
}

export interface CategoryCount {
  category: ExaminerErrorItem['category'];
  count: number;
}

/** Mistakes counted by category, most first (ties keep first-seen order). */
export function errorCategories(errors: readonly ExaminerErrorItem[]): CategoryCount[] {
  const counts = new Map<ExaminerErrorItem['category'], number>();
  for (const e of errors) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

/** Which part of the Teacher/Examiner Notes a next-step descriptor comes from (its id's letter). */
export function descriptorArea(id: string): string {
  if (id.startsWith('C')) return 'Communication';
  if (id.startsWith('S')) return 'Range of structures';
  if (id.startsWith('V')) return 'Range of vocabulary';
  return 'Quality of language';
}

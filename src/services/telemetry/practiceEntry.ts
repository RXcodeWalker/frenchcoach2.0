/**
 * "This practice session was opened from the exam report's plan" — a one-tab,
 * short-lived marker so analytics can tell whether "What to practise next"
 * actually leads to practice.
 *
 * The button only opens a screen (Learn's topic grid, the Role-play drill's
 * card list); the session itself starts a few taps later. So the button leaves
 * this marker in `sessionStorage`, and the first session of the matching kind
 * to start reads it once (it is cleared on read) and tags its start event with
 * `entry: 'exam_plan'`. A marker older than PRACTICE_ENTRY_TTL_MS, or one for
 * the other destination, is ignored — the learner went somewhere else.
 *
 * It holds two enums and a timestamp: never an answer, mark or transcript, and
 * nothing but the start events reads it.
 */
import type { ExamReportArea, PracticeEntrySource } from './telemetryService';

const KEY = 'fc_practiceEntry';
export const PRACTICE_ENTRY_TTL_MS = 30 * 60 * 1000;

export type PracticeDestination = 'learn' | 'role_play';

interface StoredEntry {
  destination: PracticeDestination;
  area: ExamReportArea;
  at: number;
}

export interface PracticeEntry {
  entry: PracticeEntrySource;
  entry_area: ExamReportArea | null;
}

const DIRECT: PracticeEntry = { entry: 'direct', entry_area: null };
const AREAS: readonly ExamReportArea[] = ['rolePlay', 'communication', 'qualityOfLanguage'];

function store(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function markPracticeEntry(destination: PracticeDestination, area: ExamReportArea, now: number = Date.now()): void {
  try {
    store()?.setItem(KEY, JSON.stringify({ destination, area, at: now } satisfies StoredEntry));
  } catch {
    /* blocked storage: the session is simply counted as direct */
  }
}

/** Reads and clears the marker. A session of the other destination leaves it in place. */
export function consumePracticeEntry(destination: PracticeDestination, now: number = Date.now()): PracticeEntry {
  try {
    const s = store();
    const raw = s?.getItem(KEY);
    if (!s || !raw) return DIRECT;
    const parsed = JSON.parse(raw) as Partial<StoredEntry>;
    const fresh = typeof parsed.at === 'number' && now - parsed.at >= 0 && now - parsed.at < PRACTICE_ENTRY_TTL_MS;
    if (!fresh || !AREAS.includes(parsed.area as ExamReportArea)) {
      s.removeItem(KEY);
      return DIRECT;
    }
    if (parsed.destination !== destination) return DIRECT;
    s.removeItem(KEY);
    return { entry: 'exam_plan', entry_area: parsed.area as ExamReportArea };
  } catch {
    return DIRECT;
  }
}

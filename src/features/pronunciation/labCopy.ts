/**
 * Everything the Lab practice flow says (pronunciation-lab plan §3.2, §5.1).
 * Pure, so the wording rules are tested in one place:
 *
 *  - Each word state has an icon AND a word, never colour alone; the legend
 *    is always on screen.
 *  - The only number is "N of M words clear" (owner D5: no 0–100 score).
 *  - "Worth practising", never "wrong"; "Try again" is the only negative a
 *    drill says.
 */

import type { CheckTrend } from '../../domain/pronunciation/lab/monthlyCheck';
import type { CheckNotice } from './monthlyCheckState';
import type { LabNotice } from './labPracticeState';
import type { LabWordState } from '../../domain/pronunciation/lab/types';
import type { DrillVerdict, LabTakeCounts } from '../../domain/pronunciation/lab/wordStates';
import type { TakeComparison } from '../../domain/pronunciation/lab/takeCompare';
import { TRIM_CONFIG, type PauseStats } from '../../domain/examPronunciation/trim';

export interface WordStateDisplay {
  /** Shown before the word; aria-hidden (the label carries the meaning). */
  glyph: string;
  label: string;
  /** Role-token classes for the word chip (Design System v2). */
  chip: string;
}

export const WORD_STATE_DISPLAY: Readonly<Record<LabWordState, WordStateDisplay>> = {
  clear: { glyph: '✓', label: 'Clear', chip: 'bg-progress-soft text-progress-text' },
  almost: { glyph: '~', label: 'Almost', chip: 'bg-reward-soft text-reward-text' },
  practise: { glyph: '●', label: 'Practise this', chip: 'bg-correction-soft text-correction-text' },
  missed: { glyph: '—', label: 'Not heard', chip: 'bg-track text-ink-muted' },
  extra: { glyph: '+', label: 'Extra word', chip: 'bg-info-soft text-info-text' },
  unknown: { glyph: '', label: 'Not checked', chip: 'text-ink' },
};

/** The legend's states, in this order; "Extra word" only joins when the take has one. */
export function legendStates(hasExtra: boolean): LabWordState[] {
  const states: LabWordState[] = ['clear', 'almost', 'practise', 'missed'];
  return hasExtra ? [...states, 'extra'] : states;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** "9 of 11 words clear". */
export function clearHeadline(counts: Pick<LabTakeCounts, 'clear' | 'total'>): string {
  return `${counts.clear} of ${counts.total} ${plural(counts.total, 'word', 'words')} clear`;
}

/** First take vs best take ("7 → 10 words clear"); null when there's nothing to say yet. */
export function comparisonLine(comparison: TakeComparison | null): string | null {
  if (!comparison) return null;
  const words = plural(comparison.total, 'word', 'words');
  if (comparison.improvedOverFirst) {
    return `First take ${comparison.firstClear} → best ${comparison.bestClear} of ${comparison.total} ${words} clear`;
  }
  return `Best so far: ${comparison.bestClear} of ${comparison.total} ${words} clear`;
}

export const NOTICE_TEXT: Readonly<Record<LabNotice, string>> = {
  'mic-unavailable': "The microphone isn't available, so I can't hear a take. You can still listen to the sentence.",
  'check-failed': "I couldn't check that take. Try again, or carry on.",
  'too-short': "That was too short to check — say it all in one go.",
  'no-word-check': "I heard you, but I couldn't check the words this time. Listen back, or try again.",
  'allowance-used': "You've used today's checks, so I can't check more takes until tomorrow. You can still listen to the sentence and to every word.",
};

export interface VerdictDisplay {
  glyph: string;
  label: string;
  line: string;
  chip: string;
}

/** A focus-word drill result. "Try again" never says "wrong". */
export const DRILL_VERDICT_DISPLAY: Readonly<Record<DrillVerdict, VerdictDisplay>> = {
  clear: { glyph: '✓', label: 'Clear', line: 'That one was clear.', chip: 'bg-progress-soft text-progress-text' },
  almost: { glyph: '~', label: 'Almost', line: 'Almost there — one more listen, then go again.', chip: 'bg-reward-soft text-reward-text' },
  tryAgain: { glyph: '●', label: 'Try again', line: 'Worth another go: listen slowly, then say it again.', chip: 'bg-correction-soft text-correction-text' },
  unknown: { glyph: '', label: 'Not checked', line: "I couldn't check that one.", chip: 'bg-track text-ink-muted' },
};

/** What Compare says about the focus words of a take. */
export function focusLead(emphasis: 'none' | 'offer' | 'suggest', words: readonly string[]): string | null {
  if (emphasis === 'none' || words.length === 0) return null;
  if (emphasis === 'offer') return `Nearly all clear. Want to practise « ${words[0]} »?`;
  const quoted = words.map((w) => `« ${w} »`).join(' and ');
  const lead = words.length === 1 ? 'One word' : words.length === 2 ? 'Two words' : 'A few words';
  return `${lead} worth practising: ${quoted}.`;
}

/** The four stepper labels (plan §3.2). */
export const STEP_LABELS = ['Listen', 'Say it', 'Compare', 'Focus'] as const;

/** The "Flow" line on a Learn answer (plan §3.1 item 2): descriptive, never a level. Null when nothing was measured. */
export function flowLine(pauses: Pick<PauseStats, 'pausesOver2s'> | null): string | null {
  if (!pauses) return null;
  if (pauses.pausesOver2s === 0) return 'Smooth — no long pauses.';
  const n = pauses.pausesOver2s;
  return `${n} ${plural(n, 'pause', 'pauses')} over ${TRIM_CONFIG.longPauseMs / 1000} seconds — try linking your ideas with et, mais, parce que.`;
}

/** Shown by the Lab and "How it sounded" when native audio can't play here (plan §4.2). */
export const NATIVE_UNAVAILABLE = 'Native audio isn’t available on this device.';

/** While a corrected sentence is being recorded for the first time (Stage 4b; a second or two). */
export const NATIVE_PREPARING = 'Getting the native voice ready…';

// ── The monthly check and "Your French sounds" (Stage 6, plan §3.3 / §3.4) ──────────────────────────────

/** Notices on the monthly check; the first four are the Lab's own. */
export const CHECK_NOTICE_TEXT: Readonly<Record<CheckNotice, string>> = {
  ...NOTICE_TEXT,
  'left-out': "I couldn't check the last sentence after a few tries, so it's left out of this month's check.",
  'allowance-used': "You've used today's checks, so the monthly check stops here. Come back tomorrow to finish it — the sentences you've done are kept if there are enough of them.",
};

export const CHECK_INTRO = {
  title: 'Monthly sound check',
  lead: 'Five short sentences — the same five every month.',
  why: 'Comparing different sentences mostly tells you which ones were harder. The same five, once a month, is the one fair way to see your pronunciation change.',
  how: 'Listen if you like, then say each sentence once. Your first checked take is the one that counts, so take a breath and say it all in one go.',
  leaving: 'It takes about five minutes. If you leave before the end, nothing is saved.',
} as const;

/** "Sentence 2 of 5". */
export function sentenceProgress(index: number, total: number): string {
  return `Sentence ${index + 1} of ${total}`;
}

/** "2 Oct" — a stored YYYY-MM-DD day, written for a person. */
export function dayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** The month name of a stored YYYY-MM-DD day. */
export function monthLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
}

/**
 * First check vs this one, over the sentences both measured. "Same 5 sentences" is said so the learner knows why the
 * two counts can be set side by side; never a verdict, never a number besides "N of M words clear".
 */
export function trendLine(trend: CheckTrend): string {
  const before = clearHeadline(trend.before);
  const after = clearHeadline(trend.after);
  return `${dayLabel(trend.fromDay)}: ${before}. ${dayLabel(trend.toDay)}: ${after}.`;
}

export const SOUNDS_CARD = {
  title: 'Your French sounds',
  strongest: 'Going well',
  workOn: 'Worth working on',
  empty: 'Practise a sentence in Learn and say it aloud — your sounds show up here after a few takes on a couple of days.',
  gettingMore: 'Not enough takes yet to name your sounds. A few more, on another day, and they appear here.',
  signedOut: 'Sign in to check how your words sound — your sounds show up here.',
  checkDue: 'Take the monthly check',
  checkDone: 'Monthly check done',
  checkAgain: 'Do it again next month',
} as const;

// ── The daily allowance (Stage 7, owner D3: 30 checked takes per account per day) ────────────────────────

/**
 * "12 checks left today" — a check is one recorded take sent to be checked. Null until the allowance is known.
 * Out of checks says what still works and when it comes back, never "limit reached".
 */
export function allowanceLine(remaining: number | null): string | null {
  if (remaining === null) return null;
  if (remaining <= 0) return 'No checks left today. You can still listen — they come back tomorrow.';
  return `${remaining} ${plural(remaining, 'check', 'checks')} left today · each recording you make uses one`;
}

/** Label under a record button that can't be used because today's checks are gone. */
export const ALLOWANCE_RECORD_LABEL = 'No checks left today';

/** The monthly check's intro line about the allowance; null when nothing needs saying. */
export function checkAllowanceLine(remaining: number | null, sentences: number, minimum: number): string | null {
  if (remaining === null) return null;
  if (remaining < minimum) {
    return `You have ${remaining} ${plural(remaining, 'check', 'checks')} left today, and the monthly check needs at least ${minimum} to be worth saving. Come back tomorrow — they reset overnight.`;
  }
  if (remaining < sentences) {
    return `You have ${remaining} checks left today — enough to start, but you may not reach every sentence.`;
  }
  return `${remaining} checks left today (the check uses one for each sentence you say).`;
}

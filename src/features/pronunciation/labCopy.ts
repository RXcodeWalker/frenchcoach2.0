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

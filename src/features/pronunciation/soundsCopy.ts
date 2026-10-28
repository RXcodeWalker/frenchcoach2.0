/**
 * Everything the Lab home says (pronunciation-lab plan §3.3). Pure, so the
 * wording rules are tested in one place:
 *
 *  - A sound's status is an icon AND a word, never colour alone.
 *  - No 0–100 number anywhere (owner D5); the only counts are plain tallies
 *    ("3 words to practise", "4 of 6 right").
 *  - "Worth practising" / "Try again", never "wrong".
 */

import type { FamilyStatus } from '../../domain/pronunciation/lab/soundFamilies';
import { LAB_THRESHOLDS } from '../../domain/pronunciation/lab/thresholds';
import { TRICKY_RULES } from '../../domain/pronunciation/lab/trickyWords';
import type { DeckWord } from '../../domain/pronunciation/lab/trickyWords';

export interface StatusDisplay {
  /** Shown before the label; aria-hidden (the label carries the meaning). */
  glyph: string;
  label: string;
  /** Role-token classes for the chip (Design System v2). */
  chip: string;
}

/** "Your sounds" statuses (plan §3.3), from Lab takes only. */
export const FAMILY_STATUS_DISPLAY: Readonly<Record<FamilyStatus, StatusDisplay>> = {
  clear: { glyph: '✓', label: 'Clear', chip: 'bg-progress-soft text-progress-text' },
  gettingThere: { glyph: '~', label: 'Getting there', chip: 'bg-reward-soft text-reward-text' },
  needsWork: { glyph: '●', label: 'Needs work', chip: 'bg-correction-soft text-correction-text' },
  notEnoughData: { glyph: '', label: 'Not enough data yet', chip: 'bg-track text-ink-muted' },
};

export const HOME_TITLE = 'Pronunciation Lab';
export const HOME_INTRO = 'Listen, say it, hear yourself next to a native speaker — and practise the sounds that matter.';

export const YOUR_SOUNDS_HELP = `A sound shows a status after ${LAB_THRESHOLDS.family.minObservations} checked words on ${LAB_THRESHOLDS.family.minDays} different days of Lab practice. Tap a sound for its guide.`;

export const TEXT_ONLY_NOTE = 'Also in the guide — sounds you can see in the spelling:';

/** A tally on the Tricky words card. */
export function trickyCardNote(deck: readonly DeckWord[]): string {
  if (deck.length === 0) return 'Words you find hard collect here';
  const due = deck.filter((d) => d.due).length;
  if (due === 0) return `${deck.length} ${deck.length === 1 ? 'word' : 'words'} — all practised today`;
  return `${due} ${due === 1 ? 'word' : 'words'} to practise`;
}

export const TRICKY_EMPTY_TITLE = 'No tricky words yet.';
export const TRICKY_EMPTY_BODY = `A word joins this list when it comes up as "Practise this" ${TRICKY_RULES.practiseToJoin === 2 ? 'twice' : `${TRICKY_RULES.practiseToJoin} times`} in your Lab practice. It leaves when you say it clearly on ${TRICKY_RULES.clearDaysToLeave === 2 ? 'two different days' : `${TRICKY_RULES.clearDaysToLeave} different days`}.`;

export function trickyHeadline(deck: readonly DeckWord[]): string {
  const due = deck.filter((d) => d.due).length;
  if (deck.length === 0) return TRICKY_EMPTY_TITLE;
  if (due === 0) return 'All practised for today.';
  return `${due} ${due === 1 ? 'word' : 'words'} to practise today.`;
}

export const TRICKY_HELP = 'Say each word again. A word leaves the list once it’s clear on two different days.';

/** What a card says after a try, given where the word stands now. */
export function trickyProgressLine(
  verdict: 'clear' | 'almost' | 'tryAgain' | 'unknown',
  after: { status: 'watching' | 'tricky' | 'cleared' | 'absent'; clearRun: number },
): string | null {
  if (verdict === 'clear') {
    if (after.status === 'cleared') return 'Clear on two different days — this word has left your list.';
    if (after.status === 'tricky' && after.clearRun >= 1) return 'Clear today. Say it clearly on another day and it leaves your list.';
    return null;
  }
  return null;
}

export const TRICKY_DRILL_FULL = 'That’s enough tries for this word today — it will be here next time.';

export function earPrompt(index: number, total: number): string {
  return `Question ${index + 1} of ${total}: which word did you hear?`;
}

export const EAR_INTRO = 'Listen to one word and pick the one you heard. Hearing the difference comes before saying it. No recording needed.';

/** After an answer. Never "wrong". */
export function earVerdictLine(correct: boolean, answer: string): string {
  return correct ? `Yes — « ${answer} ».` : `That one was « ${answer} ». Listen to both.`;
}

export function earRoundSummary(correct: number, total: number): string {
  if (correct === total) return 'Every one — your ear is sharp.';
  if (correct >= Math.ceil(total / 2)) return 'Good listening. Another round will sharpen it.';
  return 'These contrasts are hard at first. Listen to each pair a few times, then go again.';
}

export const PRACTISE_TITLE = 'Practise a sentence';
export const PRACTISE_INTRO = 'Pick a sentence, listen, then say it and compare.';
export const PRACTISE_EMPTY = 'No sentences with that sound here. Try another topic or sound.';
export const NOTEBOOK_PRACTISE_NOTE = 'These are the answers you kept. The first time you play one, the voice may take a moment to get ready.';

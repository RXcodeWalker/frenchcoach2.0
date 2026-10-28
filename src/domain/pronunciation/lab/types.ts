/**
 * Pronunciation Lab — shared types (pronunciation-lab plan §4, §5). Pure.
 */

/**
 * The 12 sound families (plan §5.2). `liaison` and `elision` are text features
 * only: Azure doesn't score them, so they appear in "watch out for" and the
 * guides, never in "Your sounds" (see `SCORED_FAMILIES`).
 */
export type SoundFamilyId =
  | 'frenchR'
  | 'uOu'
  | 'nasalAn'
  | 'nasalOn'
  | 'nasalIn'
  | 'eAccents'
  | 'eu'
  | 'silentFinal'
  | 'liaison'
  | 'elision'
  | 'gnIll'
  | 'oi';

/**
 * Plan §5.1. Scripted results only — `wordStates.ts` gives every word of a
 * freeform result `unknown`.
 */
export type LabWordState = 'clear' | 'almost' | 'practise' | 'missed' | 'extra' | 'unknown';

/** A playback range in the learner's original in-memory recording, in seconds. */
export interface ClipWindow {
  startS: number;
  endS: number;
}

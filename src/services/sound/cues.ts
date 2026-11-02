/**
 * The sound-effect cues, as data. Every cue is a handful of short, soft notes
 * synthesised with the Web Audio API (`sfx.ts`) — there are no audio files, so
 * nothing is downloaded, licensed or recorded.
 *
 * Design rules (keep new cues inside them):
 *  - Under half a second, except the three celebrations (≤ 0.9 s).
 *  - Sine or triangle only, quiet peak gain: a cue is a nudge, never a buzzer.
 *  - A miss is a low, soft "thud", not a harsh error tone — it is a learning app.
 *  - A cue never says how *well* something went in Examiner voice or in an exam:
 *    `ready` and `complete` are deliberately neutral (docs/decisions/0005).
 */

export type SfxName =
  | 'correct'
  | 'almost'
  | 'wrong'
  | 'xp'
  | 'gem'
  | 'ready'
  | 'stop'
  | 'complete'
  | 'levelUp'
  | 'achievement'
  | 'victory'
  | 'defeat';

export interface Note {
  /** Frequency in Hz. */
  f: number;
  /** Start, seconds after the cue begins. */
  at: number;
  /** Length in seconds. */
  dur: number;
  /** Peak gain 0–1, before the master gain. */
  gain: number;
  type?: 'sine' | 'triangle';
  /** Glide to this frequency over the note. */
  to?: number;
}

export interface Cue {
  /** A quieter cue is dropped if a louder one is still sounding. */
  priority: number;
  notes: readonly Note[];
}

// Equal-tempered pitches the cues are built from.
const E4 = 329.63;
const D4 = 293.66;
const B3 = 246.94;
const C5 = 523.25;
const B4 = 493.88;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const B5 = 987.77;
const C6 = 1046.5;
const D6 = 1174.66;
const E6 = 1318.51;
const G6 = 1567.98;
const A6 = 1760;
const D7 = 2349.32;

export const CUES: Record<SfxName, Cue> = {
  // Right answer: a rising fourth.
  correct: { priority: 2, notes: [
    { f: E5, at: 0, dur: 0.1, gain: 0.5 },
    { f: A5, at: 0.08, dur: 0.24, gain: 0.5 },
  ] },
  // Close, not there yet: one note that leans down a little — neither reward nor penalty.
  almost: { priority: 1, notes: [
    { f: C5, at: 0, dur: 0.26, gain: 0.4, type: 'triangle', to: B4 },
  ] },
  // A miss: a soft downward thud. Kept at or above ~250 Hz: phone and laptop speakers
  // barely reproduce anything lower, and a cue nobody can hear is no cue.
  wrong: { priority: 2, notes: [
    { f: E4, at: 0, dur: 0.24, gain: 0.6, type: 'triangle', to: B3 },
  ] },
  // XP lands.
  xp: { priority: 1, notes: [
    { f: B5, at: 0, dur: 0.09, gain: 0.35 },
    { f: E6, at: 0.07, dur: 0.18, gain: 0.35 },
  ] },
  // A gem: a small bell (two partials).
  gem: { priority: 1, notes: [
    { f: G6, at: 0, dur: 0.32, gain: 0.3 },
    { f: D7, at: 0, dur: 0.18, gain: 0.14 },
  ] },
  // Feedback has arrived. Neutral on purpose: it does not hint at the result.
  ready: { priority: 1, notes: [
    { f: A5, at: 0, dur: 0.12, gain: 0.3 },
    { f: D6, at: 0.09, dur: 0.2, gain: 0.3 },
  ] },
  // The recording ended and was received.
  stop: { priority: 1, notes: [
    { f: E5, at: 0, dur: 0.07, gain: 0.25 },
  ] },
  // A session or round is over. Neutral: it does not depend on how it went.
  complete: { priority: 3, notes: [
    { f: C5, at: 0, dur: 0.5, gain: 0.26, type: 'triangle' },
    { f: E5, at: 0, dur: 0.5, gain: 0.22, type: 'triangle' },
    { f: G5, at: 0, dur: 0.5, gain: 0.22, type: 'triangle' },
    { f: C6, at: 0.17, dur: 0.55, gain: 0.3 },
  ] },
  levelUp: { priority: 3, notes: [
    { f: C5, at: 0, dur: 0.1, gain: 0.4 },
    { f: E5, at: 0.09, dur: 0.1, gain: 0.4 },
    { f: G5, at: 0.18, dur: 0.1, gain: 0.4 },
    { f: C6, at: 0.27, dur: 0.5, gain: 0.45, type: 'triangle' },
  ] },
  achievement: { priority: 4, notes: [
    { f: G5, at: 0, dur: 0.1, gain: 0.4 },
    { f: G5, at: 0.12, dur: 0.1, gain: 0.4 },
    { f: C6, at: 0.24, dur: 0.14, gain: 0.4 },
    { f: E6, at: 0.38, dur: 0.5, gain: 0.42, type: 'triangle' },
    { f: C5, at: 0.38, dur: 0.5, gain: 0.25, type: 'triangle' },
  ] },
  // A boss fight won / lost.
  victory: { priority: 4, notes: [
    { f: C5, at: 0, dur: 0.1, gain: 0.4 },
    { f: E5, at: 0.09, dur: 0.1, gain: 0.4 },
    { f: G5, at: 0.18, dur: 0.1, gain: 0.4 },
    { f: C6, at: 0.27, dur: 0.1, gain: 0.4 },
    { f: E6, at: 0.36, dur: 0.1, gain: 0.4 },
    { f: G6, at: 0.45, dur: 0.5, gain: 0.42, type: 'triangle' },
    { f: A6, at: 0.45, dur: 0.5, gain: 0.1 },
  ] },
  defeat: { priority: 3, notes: [
    { f: E4, at: 0, dur: 0.22, gain: 0.45, type: 'triangle' },
    { f: D4, at: 0.2, dur: 0.22, gain: 0.45, type: 'triangle' },
    { f: B3, at: 0.4, dur: 0.45, gain: 0.45, type: 'triangle' },
  ] },
};

/** How long a cue sounds, in seconds (used to let a quieter cue wait for a louder one). */
export function cueLength(cue: Cue): number {
  return cue.notes.reduce((end, n) => Math.max(end, n.at + n.dur), 0);
}

/**
 * The warm-up turn's recogniser check (junior-track §2). The warm-up itself is
 * always accepted — Léo wakes up whatever happens — but what the kid's
 * « Bonjour Léo » produced decides which recogniser the rest of the mission uses:
 *
 * | Mic heard sound? | Transcript usable? | Decision                                   |
 * |------------------|--------------------|--------------------------------------------|
 * | yes              | yes                | `webSpeech` for the rest of the mission    |
 * | yes              | no                 | `whisper` for the rest of the mission      |
 * | no               | —                  | `checkMic`: an icon hint, then one more try |
 *
 * Two deliberate readings of that table:
 *  - A usable transcript proves the mic worked, so it is `webSpeech` even when the
 *    level meter stayed under the threshold (a quiet kid is the main risk this
 *    track is designed around — never tell them to check a mic that heard them).
 *  - `checkMic` is offered once. On the second try with still no sound the mission
 *    carries on (§2) on the default recogniser: there is no evidence Whisper would
 *    hear more from a silent mic.
 *
 * Pure. The mic level comes from `useMicLevel`'s smoothed 0–1 `levelRef` (already
 * noise-floored); the caller passes the peak it saw during the warm-up.
 */
import type { Recogniser } from './types';

/**
 * Peak `useMicLevel` level that counts as "the mic heard sound". UNVALIDATED:
 * a starting point, tuned at the playtest with the other Junior mic constants.
 */
export const MIC_SOUND_LEVEL = 0.08;

export type WarmupDecision = Recogniser | 'checkMic';

export interface WarmupInput {
  /** Highest `useMicLevel` level seen while the kid spoke (0–1). */
  peakMicLevel: number;
  transcript: string;
  /** 1 for the first try, 2 after a `checkMic` hint. */
  attempt: number;
}

/** A transcript is usable when the recogniser returned any word at all. */
export function transcriptUsable(transcript: string): boolean {
  return /[\p{L}\p{N}]/u.test(transcript ?? '');
}

export function decideWarmup({ peakMicLevel, transcript, attempt }: WarmupInput): WarmupDecision {
  if (transcriptUsable(transcript)) return 'webSpeech';
  if (peakMicLevel >= MIC_SOUND_LEVEL) return 'whisper';
  return attempt <= 1 ? 'checkMic' : 'webSpeech';
}

/**
 * The kid said nothing: no usable transcript AND the mic level never reached
 * MIC_SOUND_LEVEL. On a question or « Et toi ? » turn this is re-asked, not
 * recorded (turnFlow.ts's `silentQuestion` / `silentEtToi`). Sound with no usable
 * transcript is NOT silence: that is a recogniser miss and an ordinary `none`.
 */
export function isSilent({ peakMicLevel, transcript }: Pick<WarmupInput, 'peakMicLevel' | 'transcript'>): boolean {
  return !transcriptUsable(transcript) && peakMicLevel < MIC_SOUND_LEVEL;
}

import { useEffect } from 'react';
import { holdSfxSilence, playSfx } from './sfx';
import type { SfxName } from './cues';

/**
 * Keep sound off while `active` and the calling component is mounted. Every
 * recorder uses this for as long as its mic is open; `ExamLayout` uses it for
 * the whole exam.
 */
export function useSfxSilence(active = true): void {
  useEffect(() => {
    if (!active) return;
    return holdSfxSilence();
  }, [active]);
}

/** Recognisers keep capturing briefly after stop(); a cue must not land in that tail. */
export const MIC_SILENCE_TAIL_MS = 200;

/**
 * Keep sound off for as long as a microphone is open, plus a short tail after it
 * closes. Every recorder calls this with its `isRecording`, which is what stops a
 * cue from ever being captured into a transcript or a pronunciation take.
 */
export function useMicSilence(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const release = holdSfxSilence();
    return () => {
      setTimeout(release, MIC_SILENCE_TAIL_MS);
    };
  }, [open]);
}

/**
 * Play `cue` when `trigger` changes (and once on mount if `cue` is set). Pass a
 * `null` cue for "nothing to play". Derive both from the data that already
 * drives the screen — an answer result, a feedback object — so a re-render with
 * the same result never repeats the cue.
 */
export function useSfxOnChange(cue: SfxName | null | undefined, trigger: unknown, delayMs = 0): void {
  useEffect(() => {
    if (cue) playSfx(cue, { delayMs });
    // `cue` is derived from `trigger`; the trigger is what says "a new result".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}

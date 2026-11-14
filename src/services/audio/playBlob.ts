import { attachEngine } from './playbackControl';

/**
 * Plays a recording through an <audio> element and resolves when it ends,
 * fails or is stopped — for a blob Web Audio may not decode (MediaRecorder's
 * webm, which <audio> plays fine). Pause/resume come from the play button
 * through `playbackControl.ts`.
 */
export function playBlob(blob: Blob): Promise<void> {
  if (typeof Audio === 'undefined') return Promise.resolve();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise<void>((resolve) => {
    let done = false;
    let detach: (() => void) | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      detach?.();
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
    detach = attachEngine({
      pause: () => audio.pause(),
      resume: () => void audio.play().catch(finish),
      stop: finish,
    });
    void audio.play().catch((err: unknown) => {
      // AbortError: paused before it started (a pause pressed while loading) — not a failure.
      if ((err as { name?: string } | null)?.name !== 'AbortError') finish();
    });
  });
}

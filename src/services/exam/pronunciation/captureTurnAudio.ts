/**
 * Exam-mode pronunciation analysis, Batch 3 — hand a just-submitted turn's
 * recording to the in-memory audio store.
 *
 * Called by ExamMode.handleSubmitTurn AFTER `session.submitTurn` resolves, with
 * the blob promise it grabbed right after `recording.stop()`. It is
 * fire-and-forget: it returns synchronously and never delays the examiner's next
 * action. The blob is keyed by the candidate ConductLog entry's `seq`, which is
 * only known once submitTurn has appended that entry — the last candidate entry
 * in the log is, by construction, the turn that was just submitted.
 *
 * Only genuine speech turns are stored (see `isSpeechTurn`): a turn the engine
 * logged as a repeat request, "je ne sais pas" or non-French is not
 * pronunciation evidence, and typed and greeting turns never reach this code.
 */

import { isSpeechTurn } from '../../../domain/examPronunciation/segment';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import { putTurnAudio } from './examAudioStore';

/**
 * Returns a promise that resolves (never rejects) once the blob has been stored
 * or skipped. Callers must NOT await it on the submit path; it exists so the
 * end-of-exam measurement can wait for the final turn's blob to land.
 */
export function captureTurnAudio(
  sessionId: string,
  entries: readonly ConductLogEntry[],
  blobPromise: Promise<Blob | null>,
): Promise<void> {
  let turn: ConductLogEntry | undefined;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind === 'candidate') { turn = entries[i]; break; }
  }
  if (!turn || !isSpeechTurn(turn)) return Promise.resolve();

  const turnKey = turn.seq;
  return blobPromise.then(
    (blob) => putTurnAudio(sessionId, turnKey, blob),
    () => { /* no recording for this turn — it simply has no audio */ },
  );
}

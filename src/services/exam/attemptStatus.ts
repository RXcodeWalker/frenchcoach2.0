/**
 * Step 5 (ADR-0007): pure "does this attempt count toward progress" check,
 * shared between ExamMode (to set Session.practiceOnly) and ExamResults (to
 * render the "doesn't count" banner and its reasons). The last two checks
 * (userCorrected, a typed candidate utterance) should be impossible in Exam
 * Sim by construction — this is defence-in-depth for a resumed pre-change
 * session, not the primary gate (coached).
 */

import type { SessionTranscript } from '../../domain/igcse/stt/types';

export interface AttemptStatusInput {
  coached: boolean;
  transcript: Pick<SessionTranscript, 'userCorrected' | 'utterances'>;
  /**
   * D3 (exam-conduct §2): Exam Sim's 10-minute preparation is a fixed
   * countdown with no early start — "Start now" is offered anyway, but it
   * makes the attempt practice-only, the same treatment as a typed answer.
   */
  earlyStart?: boolean;
  /**
   * D15 (exam-conduct §19): the notes require an uninterrupted recording, but
   * a reload mid-exam is still allowed to resume — it just makes the attempt
   * practice-only, the same treatment as a typed answer.
   */
  resumed?: boolean;
}

export interface AttemptStatus {
  countsTowardProgress: boolean;
  /** Human-readable reasons this attempt doesn't count — empty when it does. */
  reasons: string[];
}

export function countsTowardProgress({ coached, transcript, earlyStart, resumed }: AttemptStatusInput): AttemptStatus {
  const reasons: string[] = [];

  if (coached) {
    reasons.push('You had examiner feedback during the test');
  }
  if (earlyStart) {
    reasons.push('You started before the preparation time was over');
  }
  if (resumed) {
    reasons.push('Your exam was resumed after a reload');
  }
  if (transcript.userCorrected) {
    reasons.push('You edited your transcript');
  }
  const typedCount = transcript.utterances.filter((u) => u.role === 'candidate' && u.inputMode === 'text').length;
  if (typedCount > 0) {
    reasons.push(`${typedCount} answers were typed`);
  }

  return { countsTowardProgress: reasons.length === 0, reasons };
}

/** Competitive runs (Daily Challenge, Duels) are always Exam Sim, whatever the candidate's picker choice was. */
export function resolveCoachedMode(requestedCoached: boolean, isCompetitiveRun: boolean): boolean {
  return isCompetitiveRun ? false : requestedCoached;
}

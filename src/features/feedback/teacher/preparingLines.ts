import type { TeacherRegister } from './persona';

/**
 * The one status line shown while feedback is generated (Learn feedback
 * Batch 6b). It follows the REAL stream phase — nothing is rotated for effect
 * and nothing claims a result, mark or band. The wait itself is spent on the
 * Predict card, not on fun messages.
 */

/** After this long the line admits the wait instead of repeating the phase. */
export const SLOW_AFTER_MS = 12_000;

export type PreparingPhase = 'transcribing' | 'generating' | 'complete' | null | undefined;

const LINES: Record<TeacherRegister, { transcribing: string; generating: string; slow: string }> = {
  coach: {
    transcribing: 'Listening back to your answer…',
    generating: 'Reading what you said…',
    slow: 'Taking a little longer — still on it.',
  },
  examiner: {
    transcribing: 'Transcribing your answer…',
    generating: 'Reviewing your response…',
    slow: 'This is taking a little longer. Still working on it.',
  },
};

/** Every line, for tests that check they stay free of marks, bands and result claims. */
export const PREPARING_LINES = LINES;

/**
 * The line for this moment, or null when there is nothing honest to say yet
 * (no phase has been reported) or the feedback has arrived.
 */
export function preparingLine(
  phase: PreparingPhase,
  elapsedMs: number,
  register: TeacherRegister = 'coach',
): string | null {
  if (phase === 'complete') return null;
  const lines = LINES[register];
  if (elapsedMs >= SLOW_AFTER_MS) return lines.slow;
  if (phase === 'transcribing') return lines.transcribing;
  if (phase === 'generating') return lines.generating;
  return null;
}

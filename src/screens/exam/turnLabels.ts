import type { ConductLogEntry } from '../../domain/igcse/session/types';

export interface TurnLabel {
  /** The question number this turn belongs to (a repeat keeps the number it repeats). */
  n: number;
  /** "Q3" for an examiner turn, "A3" for the candidate's answer to it. */
  label: string;
}

/** Examiner actions that put a new question or prompt to the candidate. */
const NEW_QUESTION = new Set(['READ_MAIN', 'READ_ALTERNATIVE', 'EXTENSION_PROMPT', 'FURTHER_QUESTION']);

/**
 * Numbers the visible conversation Q1, A1, Q2, A2 … from the conduct log, keyed
 * by entry `seq` (which is also the rail's turnKey). Blank turns are skipped the
 * same way ExamTranscript skips them, so both panes agree. Examiner turns that
 * ask nothing new (transitions, the closing line) are unnumbered.
 */
export function buildTurnLabels(entries: ConductLogEntry[]): Map<number, TurnLabel> {
  const labels = new Map<number, TurnLabel>();
  let n = 0;
  for (const e of entries) {
    if (e.kind === 'examiner') {
      if (e.text.trim().length === 0) continue;
      if (NEW_QUESTION.has(e.action)) {
        n += 1;
        labels.set(e.seq, { n, label: `Q${n}` });
      } else if (e.action === 'REPEAT' && n > 0) {
        labels.set(e.seq, { n, label: `Q${n}` });
      }
    } else if (e.transcript.trim().length > 0 && n > 0) {
      labels.set(e.seq, { n, label: `A${n}` });
    }
  }
  return labels;
}

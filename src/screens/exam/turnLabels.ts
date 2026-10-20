import type { ConductLogEntry } from '../../domain/igcse/session/types';

export interface TurnLabel {
  /** The part this turn belongs to (`rolePlay`, `topic1`, `topic2`). */
  part: string;
  /**
   * The question's reference within its part: "3" for authored question/task 3,
   * "3b" for the second part of a two-part question, "+1" for the topic's first
   * further question. Repeats, alternatives and extension prompts keep the
   * reference of the question they belong to.
   */
  ref: string;
  /** "Q3" for an examiner turn, "A3" for the candidate's answer to it. */
  label: string;
}

/**
 * Numbers the visible conversation from the conduct log, keyed by entry `seq`
 * (which is also the rail's turnKey), so the labels match the exam's own
 * structure and the "Question N of 5" header rather than counting every prompt:
 *
 * - numbering restarts in each part and follows the authored question order;
 * - a two-part question's second part (a second READ_MAIN for the same
 *   questionId, exam-conduct §7) is "Q3b", not a new question;
 * - a repeat, an alternative question or an extension prompt ("Donne-moi plus
 *   de détails.") stays on the question it belongs to;
 * - a topic's further questions (exam-conduct §19) are "Q+1", "Q+2".
 *
 * Blank turns are skipped the same way ExamTranscript skips them, so both panes
 * agree. Examiner turns that ask nothing (transitions, the closing line) are
 * unnumbered. Display only: marking groups turns by questionId, never by label.
 */
export function buildTurnLabels(entries: ConductLogEntry[]): Map<number, TurnLabel> {
  const labels = new Map<number, TurnLabel>();
  let part: string | null = null;
  let numberById = new Map<string, number>();
  let mainReadsById = new Map<string, number>();
  let furtherCount = 0;
  let current: string | null = null;

  const set = (seq: number, prefix: 'Q' | 'A', ref: string) => {
    labels.set(seq, { part: part ?? '', ref, label: `${prefix}${ref}` });
  };

  for (const e of entries) {
    if (e.kind === 'examiner') {
      if (e.text.trim().length === 0) continue;
      if (e.part !== part) {
        part = e.part;
        numberById = new Map();
        mainReadsById = new Map();
        furtherCount = 0;
        current = null;
      }
      const id = e.questionId;
      switch (e.action) {
        case 'READ_MAIN': {
          if (!id) break;
          if (!numberById.has(id)) numberById.set(id, numberById.size + 1);
          const reads = (mainReadsById.get(id) ?? 0) + 1;
          mainReadsById.set(id, reads);
          current = reads >= 2 ? `${numberById.get(id)}b` : `${numberById.get(id)}`;
          set(e.seq, 'Q', current);
          break;
        }
        case 'READ_ALTERNATIVE':
        case 'EXTENSION_PROMPT': {
          if (id && !numberById.has(id)) {
            numberById.set(id, numberById.size + 1);
            current = `${numberById.get(id)}`;
          }
          if (current) set(e.seq, 'Q', current);
          break;
        }
        case 'FURTHER_QUESTION': {
          furtherCount += 1;
          current = `+${furtherCount}`;
          set(e.seq, 'Q', current);
          break;
        }
        case 'REPEAT': {
          if (current) set(e.seq, 'Q', current);
          break;
        }
        default:
          break;
      }
    } else if (e.transcript.trim().length > 0 && current) {
      set(e.seq, 'A', current);
    }
  }
  return labels;
}

/**
 * Exam-mode pronunciation analysis (feedback-only, never a mark) — step one:
 * which ConductLog entries are candidate *speech* turns that could carry audio,
 * grouped by exam part.
 *
 * Lives outside src/domain/igcse/ on purpose: nothing in the scored pipeline
 * may import it (see the exam-pronunciation plan §3c). It only reads the
 * ConductLog type; it never changes a log entry or the transcript.
 *
 * A turn is a speech turn only if ALL of these hold:
 *  - it is a candidate entry (the greeting reply is discarded before the
 *    engine ever sees it, so it can never appear here);
 *  - it did not come from the text field (`inputMode: 'text'` has no audio);
 *  - it is not a button/verbal repeat request or any other non-answer intent
 *    (a "je ne sais pas" or a clarification request is not pronunciation
 *    evidence, and `non_french` is blanked from the scored text too);
 *  - the transcript is not blank.
 *
 * `turnKey` is the entry's `seq` — the same key the corrections rail uses, so
 * a turn's audio, rail card and (later) evidence row all line up.
 *
 * Whether a turn actually *has* a recording is not decided here: that is the
 * audio store's business (a denied mic or a missing recorder is only visible
 * as "no blob for this turn").
 */

import type { ConductLogEntry } from '../igcse/session/types';
import type { SessionPart } from '../igcse/stt/types';

/** Exam order. The pronunciation surfaces (cards, report) walk parts in this order. */
export const PRONUNCIATION_PARTS: readonly SessionPart[] = ['rolePlay', 'topic1', 'topic2'];

export interface SpeechTurn {
  /** The candidate ConductLog entry's `seq`. */
  turnKey: number;
  part: SessionPart;
  questionId: string | null;
  /** The exam transcript for this turn (Web Speech, or Whisper on Firefox). */
  transcript: string;
}

export type SpeechTurnsByPart = Record<SessionPart, SpeechTurn[]>;

export function isSpeechTurn(entry: ConductLogEntry): entry is Extract<ConductLogEntry, { kind: 'candidate' }> {
  if (entry.kind !== 'candidate') return false;
  if (entry.inputMode === 'text') return false;
  if (entry.requestedRepeat) return false;
  if (entry.intent !== undefined && entry.intent !== 'answer') return false;
  return entry.transcript.trim().length > 0;
}

/** Candidate speech turns grouped by part, each part's turns in conversation order. */
export function segmentSpeechTurns(entries: readonly ConductLogEntry[]): SpeechTurnsByPart {
  const byPart: SpeechTurnsByPart = { rolePlay: [], topic1: [], topic2: [] };
  for (const entry of entries) {
    if (!isSpeechTurn(entry)) continue;
    byPart[entry.part].push({
      turnKey: entry.seq,
      part: entry.part,
      questionId: entry.questionId,
      transcript: entry.transcript,
    });
  }
  return byPart;
}

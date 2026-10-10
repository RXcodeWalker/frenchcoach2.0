/**
 * Second take (Learn feedback Batch 6c): what a spoken re-answer did with the
 * teacher's fixes. It reports what was HEARD — never a verdict on the learner,
 * and never a score.
 *
 * Per fix, exactly one of three states, and only one is ever negative:
 *  - `heard`  — the correction (or the edit it makes) is in the retake;
 *  - `still`  — the exact error words are in the retake AND the correction is
 *               not AND the error words are not part of the correction;
 *  - `absent` — neither is there. Neutral: a paraphrase that sidesteps the
 *               structure is never a miss (Web Speech also leans toward real,
 *               grammatical words, so an absence proves nothing either way).
 * Strengths: `kept` when the learner's phrase is said again, otherwise silent.
 *
 * Pure. Nothing here is XP, evidence, a session, mastery or analytics — the
 * Second take is practice only (the caller writes nothing).
 */
import { fixHeard, phraseHeard, quoteHeard, quoteInsideCorrection } from './fixMatch';

export interface RetakeFix {
  quote: string;
  correction: string;
}

export type RetakeFixState = 'heard' | 'still' | 'absent';

export interface RetakeResult {
  /** Nothing usable was heard: the caller offers another go, with no verdict. */
  empty: boolean;
  fixes: Array<RetakeFix & { state: RetakeFixState }>;
  /** Strength quotes the learner said again, in the order given. */
  kept: string[];
}

export function compareRetake(fixes: readonly RetakeFix[], strengths: readonly string[], retake: string): RetakeResult {
  const text = retake.trim();
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return { empty: true, fixes: fixes.map((f) => ({ ...f, state: 'absent' as const })), kept: [] };
  }
  return {
    empty: false,
    fixes: fixes.map((f) => {
      if (fixHeard(text, f.quote, f.correction)) return { ...f, state: 'heard' as const };
      if (quoteHeard(text, f.quote, f.correction) && !quoteInsideCorrection(f.quote, f.correction)) {
        return { ...f, state: 'still' as const };
      }
      return { ...f, state: 'absent' as const };
    }),
    kept: strengths.filter((s) => s.trim() && phraseHeard(text, s)),
  };
}

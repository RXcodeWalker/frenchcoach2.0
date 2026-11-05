/**
 * Pronunciation Lab — which words to practise after a take
 * (pronunciation-lab plan §3.2 step 4, §5.1 fairness guards). Pure.
 *
 * At most `LAB_THRESHOLDS.focus.maxWords` words: reliable ones only (a state
 * Azure actually measured — never unknown, never "Not heard", never an extra
 * word), Practise before Almost, lowest first, and not two for the same sound
 * family when another family is waiting. A take whose only non-clear word is
 * a single one gets that word *offered*, not insisted on (the owner's learners
 * are strongly accented; one low word in a clear take is often accent).
 */

import { familiesInTake } from './takeFamilies';
import { LAB_THRESHOLDS } from './thresholds';
import type { LabWordState, SoundFamilyId } from './types';
import { takeWords, type LabTake, type LabWordItem } from './wordStates';

export interface FocusWord {
  tokenIndex: number;
  /** As written in the target sentence. */
  text: string;
  /**
   * 'practise' / 'almost' for a chosen word; any measured state for a word the
   * learner picked themselves by tapping it (`pickedFocusWord`).
   */
  state: Exclude<LabWordState, 'extra'>;
  /** The sound family most likely behind it, when one can be named. */
  family: SoundFamilyId | null;
}

export interface FocusChoice {
  words: FocusWord[];
  /** 'offer': one low word in an otherwise clear take; 'suggest': the usual case; 'none': nothing to practise. */
  emphasis: 'none' | 'offer' | 'suggest';
}

function letters(text: string): number {
  return [...text].filter((c) => /\p{L}/u.test(c)).length;
}

const STATE_ORDER: Record<FocusWord['state'], number> = { practise: 0, almost: 1, missed: 2, clear: 3, unknown: 4 };

export function chooseFocusWords(take: LabTake, maxWords: number = LAB_THRESHOLDS.focus.maxWords): FocusChoice {
  if (take.refused) return { words: [], emphasis: 'none' };
  const words = takeWords(take);
  const families = familiesInTake(take);

  const candidates = words
    .filter((w): w is LabWordItem & { state: 'practise' | 'almost' } => w.state === 'practise' || w.state === 'almost')
    .filter((w) => letters(w.text) >= LAB_THRESHOLDS.focus.minLetters)
    .sort(
      (a, b) =>
        STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
        (a.accuracy ?? Infinity) - (b.accuracy ?? Infinity) ||
        a.tokenIndex - b.tokenIndex,
    );

  const chosen: FocusWord[] = [];
  const usedFamilies = new Set<SoundFamilyId>();
  for (const pass of ['distinct', 'any'] as const) {
    for (const c of candidates) {
      if (chosen.length >= maxWords) break;
      if (chosen.some((w) => w.tokenIndex === c.tokenIndex)) continue;
      const family = families.get(c.tokenIndex)?.weakest ?? null;
      if (pass === 'distinct' && family !== null && usedFamilies.has(family)) continue;
      chosen.push({ tokenIndex: c.tokenIndex, text: c.text, state: c.state, family });
      if (family) usedFamilies.add(family);
    }
  }
  chosen.sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.tokenIndex - b.tokenIndex);

  if (chosen.length === 0) return { words: [], emphasis: 'none' };
  const measured = words.filter((w) => w.state !== 'unknown');
  const nonClear = measured.filter((w) => w.state !== 'clear');
  const emphasis = nonClear.length === 1 && measured.length > 1 ? 'offer' : 'suggest';
  return { words: chosen, emphasis };
}

/**
 * A word the learner tapped to practise on its own (not one the chooser
 * picked): any word of the take, whatever its state. Null for an extra word or
 * a token the take doesn't have.
 */
export function pickedFocusWord(take: LabTake, tokenIndex: number): FocusWord | null {
  const item = takeWords(take).find((w) => w.tokenIndex === tokenIndex);
  if (!item || item.state === 'extra') return null;
  const family = take.refused ? null : familiesInTake(take).get(tokenIndex)?.weakest ?? null;
  return { tokenIndex, text: item.text, state: item.state, family };
}

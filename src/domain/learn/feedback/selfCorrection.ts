/**
 * Self-correction (owner report 2026-10-31): « …dans ton école, désolé, dans
 * mon école… ». The learner said the wrong form and fixed it straight away, so
 * the coach must not list it as a mistake to fix; it is credited instead. An
 * examiner marks what the candidate ends up saying, and an immediate repair
 * shows they know the rule.
 *
 * Deterministic and conservative. An error counts as self-corrected only when
 * the transcript has the quoted words, then at most MAX_REPAIR_GAP repair words
 * (« désolé », « pardon », « non », « je veux dire »…, or none), then the
 * correction itself, restarted at or before its first changed word. The model
 * may also quote the whole repair (« dans ton école désolé dans mon école ») —
 * the same shape inside the quote counts too. Nothing else is guessed: a
 * correct form said later in another sentence is not a self-correction.
 *
 * Pure. Used by filterCoachFeedback, which drops the error (so it never counts
 * as a failure in evidence either) and keeps the pair for display.
 */
import { canonicalizeForMatch } from '../../igcse/text/normalize';

export interface SelfCorrection {
  /** The words the feedback reported as the error, as quoted. */
  quote: string;
  /** The correction the feedback gave. */
  correction: string;
  /** The learner's own repaired words, verbatim from the transcript. */
  repair: string;
}

/** At most this many repair words between the slip and the restart. */
export const MAX_REPAIR_GAP = 4;

const REPAIR_WORDS = new Set([
  'désolé', 'désolée', 'pardon', 'non', 'enfin', 'euh', 'heu', 'hum', 'plutôt', 'oups', 'ah', 'oh',
  'attends', 'zut', 'je', 'veux', 'dire', "c'est-à-dire", 'sorry', 'i', 'mean', 'no',
]);

interface Word {
  key: string;
  raw: string;
}

function words(text: string): Word[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, key: canonicalizeForMatch(raw) }))
    .filter((w) => w.key !== '');
}

function keysEqual(a: readonly Word[], start: number, b: readonly Word[]): boolean {
  if (start < 0 || start + b.length > a.length) return false;
  return b.every((w, i) => a[start + i].key === w.key);
}

/**
 * Where, starting at `from`, the text restarts the correction after up to
 * MAX_REPAIR_GAP repair words: the repaired words, or null.
 */
function restartAt(text: readonly Word[], from: number, correction: readonly Word[], firstChange: number, limit = text.length): string | null {
  for (let gap = 0; gap <= MAX_REPAIR_GAP; gap++) {
    if (gap > 0 && (from + gap - 1 >= limit || !REPAIR_WORDS.has(text[from + gap - 1].key))) return null;
    const at = from + gap;
    for (let k = 0; k <= firstChange; k++) {
      const tail = correction.slice(k);
      if (tail.length === 0 || at + tail.length > limit) continue;
      if (keysEqual(text, at, tail)) return text.slice(at, at + tail.length).map((w) => w.raw).join(' ');
    }
  }
  return null;
}

/** The self-correction behind an error, or null when the learner did not fix it themselves. */
export function findSelfCorrection(quote: string | undefined, correction: string | undefined, transcript: string): SelfCorrection | null {
  const q = words(quote ?? '');
  const c = words(correction ?? '');
  if (q.length === 0 || c.length === 0) return null;
  let firstChange = 0;
  while (firstChange < q.length && firstChange < c.length && q[firstChange].key === c[firstChange].key) firstChange++;
  if (firstChange === q.length && q.length === c.length) return null; // the same words: nothing was fixed

  const t = words(transcript);
  const result = (repair: string): SelfCorrection => ({ quote: quote!.trim(), correction: correction!.trim(), repair });

  // The slip, then the repair after it in the transcript.
  for (let i = 0; i + q.length <= t.length; i++) {
    if (!keysEqual(t, i, q)) continue;
    const repair = restartAt(t, i + q.length, c, firstChange);
    if (repair) return result(repair);
  }

  // The model quoted the slip and its repair together: « dans ton école désolé dans mon école ».
  for (let end = 1; end < q.length; end++) {
    const slip = q.slice(0, end);
    const slipChange = (() => {
      let n = 0;
      while (n < slip.length && n < c.length && slip[n].key === c[n].key) n++;
      return n;
    })();
    if (slipChange === slip.length && slip.length === c.length) continue;
    const repair = restartAt(q, end, c, Math.min(firstChange, slipChange), q.length);
    if (repair && canonicalizeForMatch(repair) === canonicalizeForMatch(q.slice(q.length - words(repair).length).map((w) => w.raw).join(' '))) {
      return result(repair);
    }
  }
  return null;
}

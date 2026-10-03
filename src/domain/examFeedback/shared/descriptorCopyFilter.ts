/**
 * Descriptor-copy filter (Phase 3 plan, "Shared invariants"): feedback is
 * written for this candidate's answer, not pasted from the mark scheme. A
 * claim is dropped when it contains a WHOLE canonical descriptor bullet
 * (catches short ones such as "Justifies and explains some answers.") or 8 or
 * more consecutive canonicalised words of one.
 *
 * Pure: the bullets are passed in, so this module imports no rubric data.
 */

import { canonicalizeForMatch } from '../../igcse/text/normalize';

export const DESCRIPTOR_COPY_RUN_WORDS = 8;

function words(text: string): string[] {
  return canonicalizeForMatch(text)
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .split(' ')
    .filter(Boolean);
}

function padded(ws: readonly string[]): string {
  return ` ${ws.join(' ')} `;
}

/** True when `claim` copies a whole bullet, or a run of {@link DESCRIPTOR_COPY_RUN_WORDS}+ words from one. */
export function claimCopiesDescriptor(claim: string, bullets: readonly string[]): boolean {
  const claimText = padded(words(claim));
  for (const bullet of bullets) {
    const bw = words(bullet);
    if (bw.length === 0) continue;
    if (claimText.includes(padded(bw))) return true;
    for (let i = 0; i + DESCRIPTOR_COPY_RUN_WORDS <= bw.length; i++) {
      if (claimText.includes(padded(bw.slice(i, i + DESCRIPTOR_COPY_RUN_WORDS)))) return true;
    }
  }
  return false;
}

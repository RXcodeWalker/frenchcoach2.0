/**
 * Exam-mode pronunciation analysis — the fluency note (plan §2 report item 4).
 * One descriptive sentence from the pause statistics measured on the
 * UNTRIMMED audio (trim.ts) plus the existing filler signal
 * (igcse/evidence/fillers.ts, read-only). It describes what happened; it
 * never names a level, a band or a mark, and Azure's own fluency score is
 * never used (trimming inflates it).
 *
 * Returns null when no turn has pause statistics and no filler was heard —
 * there is nothing honest to say.
 */

import { countFillers } from '../igcse/evidence/fillers';
import { FAIRNESS_CONFIG } from './fairness';

export interface FluencyInput {
  /** Per analysed turn; null when the turn's pauses weren't measured. */
  pauseStats: Array<{ pausesOver2s: number; longestPauseS: number } | null>;
  /** The exam transcripts of the same turns. */
  transcripts: string[];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildFluencyNote({ pauseStats, transcripts }: FluencyInput): string | null {
  const measured = pauseStats.filter((p): p is { pausesOver2s: number; longestPauseS: number } => p !== null);
  const fillers = transcripts.reduce((n, t) => n + countFillers(t), 0);
  if (measured.length === 0 && fillers === 0) return null;

  const parts: string[] = [];
  if (measured.length > 0) {
    const longPauses = measured.reduce((n, p) => n + p.pausesOver2s, 0);
    const longest = Math.max(...measured.map((p) => p.longestPauseS));
    if (longPauses === 0) {
      parts.push(`You kept talking without stopping for more than ${FAIRNESS_CONFIG.longPauseS} seconds`);
    } else {
      parts.push(
        `You stopped for more than ${FAIRNESS_CONFIG.longPauseS} seconds ${plural(longPauses, 'time', 'times')}, the longest for about ${Math.round(longest)} seconds`,
      );
    }
  }
  if (fillers > 0) {
    parts.push(`${parts.length > 0 ? 'and you' : 'You'} used fillers such as "euh" ${plural(fillers, 'time', 'times')}`);
  }
  return `${parts.join(', ')}.`;
}

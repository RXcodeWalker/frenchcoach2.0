import type { FeedbackV2 } from '../../types';
import type { MissionLanguageNote } from './types';

/**
 * Pull soft learning tips from FeedbackV2 without exposing raw 0–10 scores.
 */
export function tipsFromFeedback(fb: FeedbackV2 | null | undefined): MissionLanguageNote[] {
  if (!fb || fb.unscored) return [];

  const notes: MissionLanguageNote[] = [];

  const critical = fb.grammar?.critical?.[0];
  if (critical?.correction) {
    notes.push({
      kind: 'tip',
      text: critical.msg
        ? `${critical.msg} → « ${critical.correction} »`
        : `Try: « ${critical.correction} »`,
    });
  } else if (critical?.msg) {
    notes.push({ kind: 'tip', text: critical.msg });
  }

  const upgrade = fb.vocabulary?.[0];
  if (upgrade?.basic && upgrade?.upgrade) {
    notes.push({ kind: 'vocab', text: `Upgrade: ${upgrade.basic} → ${upgrade.upgrade}` });
  }

  if (fb.rephrase) {
    notes.push({ kind: 'rephrase', text: fb.rephrase });
  } else if (fb.biggest_opportunity) {
    notes.push({ kind: 'tip', text: fb.biggest_opportunity });
  }

  return notes.slice(0, 2);
}

export function mergeUniqueNotes(
  existing: MissionLanguageNote[],
  incoming: MissionLanguageNote[],
  max = 3
): MissionLanguageNote[] {
  const seen = new Set(existing.map(n => n.text));
  const out = [...existing];
  for (const n of incoming) {
    if (seen.has(n.text)) continue;
    seen.add(n.text);
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

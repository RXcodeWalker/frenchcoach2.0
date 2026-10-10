import type { RetakeFix } from '../../../domain/learn/feedback/compareRetake';
import type { FeedbackPointGroup } from '../components/FeedbackPointList';

/**
 * What a Second take is held against (Learn feedback Batch 6c), read from the
 * point groups the conversation already shows — so the Coach and Examiner
 * voices share it: every fix in every group, and the quotes of the opening
 * "what worked / what you did well" group (never the "next step" or later
 * claims). Pure.
 */
export function retakeTargets(groups: readonly FeedbackPointGroup[]): { fixes: RetakeFix[]; strengths: string[] } {
  const fixes: RetakeFix[] = [];
  for (const g of groups) {
    for (const p of g.points) {
      if (p.kind === 'fix' && p.quote.trim() && p.correction.trim()) fixes.push({ quote: p.quote, correction: p.correction });
    }
  }
  const first = groups[0];
  const strengths =
    first?.tone === 'good'
      ? first.points.flatMap((p) => (p.kind === 'claim' && p.quote?.trim() ? [p.quote] : []))
      : [];
  return { fixes, strengths };
}

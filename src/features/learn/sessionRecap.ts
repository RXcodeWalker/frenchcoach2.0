// ── Learn overhaul Batch 5 — session-recap copy (pure) ───────────────────────
// Replaces the demand-mastery "+12%" bars on the summary with something a
// learner can act on ("You practised giving reasons 3×"), and decides when
// confetti is earned. Nothing numeric about mastery is shown: the belief
// engine's mastery movement is an internal estimate, not a result.
import type { SessionQuestion } from '../../types';
import type { CognitiveDemand } from '../../domain/learn/demand/types';

const ALL_DEMANDS: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];

/** Gerund phrase that finishes "You practised …". Plain English, never the raw demand id. */
const PRACTISED_PHRASE: Record<CognitiveDemand, string> = {
  describe: 'describing things',
  explain: 'explaining',
  justify: 'giving reasons',
  compare: 'comparing things',
  hypothesize: "saying what you'd do if…",
};

export interface DemandPractice {
  demand: CognitiveDemand;
  count: number;
}

/** Completed catalogue questions per cognitive demand, most-practised first. Untagged questions are skipped. */
export function demandPracticeCounts(questions: SessionQuestion[]): DemandPractice[] {
  const counts = new Map<CognitiveDemand, number>();
  for (const q of questions) {
    if (q.status !== 'completed') continue;
    const demand = q.question.demands?.cognitiveDemand;
    if (!demand) continue;
    counts.set(demand, (counts.get(demand) ?? 0) + 1);
  }
  return ALL_DEMANDS
    .filter(d => counts.has(d))
    .map(demand => ({ demand, count: counts.get(demand)! }))
    .sort((a, b) => b.count - a.count || ALL_DEMANDS.indexOf(a.demand) - ALL_DEMANDS.indexOf(b.demand));
}

export function practisedLine({ demand, count }: DemandPractice): string {
  return `You practised ${PRACTISED_PHRASE[demand]} ${count}×`;
}

/** Confetti is for a genuinely good session (average ≥ 7), not for turning up. */
export const CONFETTI_MIN_AVERAGE = 7;
export function earnsConfetti(avgScore: number | null): boolean {
  return avgScore != null && avgScore >= CONFETTI_MIN_AVERAGE;
}

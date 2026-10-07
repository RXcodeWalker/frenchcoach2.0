// ── Learner filters — Learn overhaul Batch 2 (docs §8.5). Pure. ─────────────────
//
// One predicate, one filtered pool: the same `filterPool` result feeds slotting,
// the review slot and midSessionAdjust, so no path can bring a non-matching
// question into a filtered session. An untagged question (no `demands`) never
// matches a grammar filter — it cannot be shown to match — so the escalation
// ladder (docs §8.3, rung 4) can't reintroduce it either: the ladder only ever
// sees the filtered pool.
//
// Grammar focus is derived from the demand tags already on the question
// (`timeFrames` / `structures`); there is no separate sub-topic tag yet
// (`Question.subTopic` arrives with the content batch).

import type { Question } from '../../../types';

export type GrammarFocus = 'present' | 'past' | 'future' | 'opinion';

export interface LearnFilters {
  grammar: GrammarFocus | null;
}

export const NO_FILTERS: LearnFilters = { grammar: null };

export const GRAMMAR_FOCI: { id: GrammarFocus; label: string }[] = [
  { id: 'present', label: 'Present' },
  { id: 'past', label: 'Past' },
  { id: 'future', label: 'Future & conditional' },
  { id: 'opinion', label: 'Opinions & reasons' },
];

/** A focus chip is offered only where at least this many questions match it (plan Batch 2). */
export const MIN_FOCUS_MATCHES = 5;

export function hasActiveFilters(filters: LearnFilters): boolean {
  return filters.grammar !== null;
}

function matchesGrammar(question: Question, focus: GrammarFocus): boolean {
  const demands = question.demands;
  if (!demands) return false;
  switch (focus) {
    case 'present':
      return demands.timeFrames.includes('present');
    case 'past':
      return demands.timeFrames.includes('past');
    case 'future':
      return demands.timeFrames.includes('future') || demands.timeFrames.includes('conditional');
    case 'opinion':
      return demands.structures.includes('opinion') || demands.structures.includes('justification');
  }
}

export function matchesFilters(question: Question, filters: LearnFilters): boolean {
  return filters.grammar === null || matchesGrammar(question, filters.grammar);
}

/** The filtered pool. Returns `pool` itself when no filter is active. */
export function filterPool(pool: Question[], filters: LearnFilters): Question[] {
  return hasActiveFilters(filters) ? pool.filter((q) => matchesFilters(q, filters)) : pool;
}

/** How many questions in `pool` match each grammar focus. */
export function countByGrammar(pool: Question[]): Record<GrammarFocus, number> {
  const counts: Record<GrammarFocus, number> = { present: 0, past: 0, future: 0, opinion: 0 };
  for (const { id } of GRAMMAR_FOCI) {
    for (const q of pool) if (matchesGrammar(q, id)) counts[id] += 1;
  }
  return counts;
}

/** Focus chips worth showing for this (unfiltered) topic pool. */
export function visibleGrammarFoci(pool: Question[]): GrammarFocus[] {
  const counts = countByGrammar(pool);
  return GRAMMAR_FOCI.filter(({ id }) => counts[id] >= MIN_FOCUS_MATCHES).map(({ id }) => id);
}

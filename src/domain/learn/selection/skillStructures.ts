// ── Coach skill ids → Learn question structures (docs §8.2 coachFocusMatch) ──
//
// The coach names grammar by its skill-graph ids (`tense_past`, `hypothetical`,
// `comparative`, … — services/coaching/diagnosticEngine.ts SKILL_DEFS), while
// every Learn question is tagged with `demands.structures` in its own
// vocabulary (`perfect`, `conditional`, `comparison`, …). The two lists only
// share three names (opinion, negation, subjunctive) and the bank tags only
// `opinion` among them, so intersecting them
// directly meant "the coach is focusing on your past tense" changed nothing
// about which questions a session picked. This table is the one translation.
//
// Pure data. A skill missing here (elision, gender, fluency_score, …) has no
// structure a question is tagged with, so it matches nothing — honestly.

import type { LearnStructure } from '../demand/types';

export const SKILL_TO_STRUCTURES: Readonly<Record<string, readonly LearnStructure[]>> = {
  tense_past: ['perfect', 'imperfect'],
  // Être vs avoir is the auxiliary choice inside the passé composé.
  etre_avoir: ['perfect'],
  tense_future: ['near-future', 'simple-future'],
  hypothetical: ['conditional'],
  comparative: ['comparison'],
  opinion: ['opinion'],
  negation: ['negation'],
  subjunctive: ['subjunctive'],
};

/** The question structures that practise any of these coach skills (deduplicated). */
export function structuresForSkills(skillIds: readonly string[]): LearnStructure[] {
  const out = new Set<LearnStructure>();
  for (const id of skillIds) {
    for (const s of SKILL_TO_STRUCTURES[id] ?? []) out.add(s);
  }
  return [...out];
}

/** True when a question tagged with `structures` practises at least one of `skillIds`. */
export function practisesAnySkill(structures: readonly string[], skillIds: readonly string[]): boolean {
  if (skillIds.length === 0 || structures.length === 0) return false;
  const wanted = structuresForSkills(skillIds);
  return wanted.some((s) => structures.includes(s));
}

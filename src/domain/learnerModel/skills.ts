// ── Learner model: the closed skill registry (learner-model §1) ────────────────
//
// A skill is one entry here, nothing else. Ids are kept, never renamed: drills,
// SKILL_TO_THEME, intervention problems and TOPIC_SKILL_COVERAGE all key on them.
//
//   grammar / lexis : the 22 coach skill-graph ids (services/coaching/
//                     diagnosticEngine.ts SKILL_DEFS — a test holds them equal)
//   demand          : demand:<CognitiveDemand>
//   examArea        : exam:<0520 area> — fed ONLY by counted Exam Sim marks
//
// Structures (`LearnStructure`) are question TAGS, never skills. The direction is
// explicit: `practisedBy` says where a skill is practised; the generated
// STRUCTURE_TO_SKILLS view says what evidence a question can give.
//
// Pure data. No imports from services, storage or React.

import type { CognitiveDemand, LearnStructure } from '../learn/demand/types';

export type SkillKind = 'grammar' | 'lexis' | 'demand' | 'examArea';

export interface SkillEntry {
  id: string;
  kind: SkillKind;
  /** Question structures that make a learner use this skill. */
  practisedBy: readonly LearnStructure[];
  /** Every answer is a chance to show it (gender, elision …): no structure narrows it. */
  ubiquitous?: true;
  /** Never a focus target (no question can be chosen for it). */
  notSelectable?: true;
  /** Why the entry is shaped this way — required for ubiquitous and notSelectable entries. */
  reason?: string;
}

export const ALL_STRUCTURES: readonly LearnStructure[] = [
  'opinion', 'justification', 'comparison', 'negation', 'perfect',
  'imperfect', 'near-future', 'simple-future', 'conditional', 'subjunctive',
];

export const ALL_DEMANDS: readonly CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];

export type ExamAreaKey = 'rolePlay' | 'communication' | 'qualityOfLanguage';
export const EXAM_AREAS: readonly ExamAreaKey[] = ['rolePlay', 'communication', 'qualityOfLanguage'];

export function examAreaNodeId(area: ExamAreaKey): string {
  return `exam:${area}`;
}

const UBIQUITOUS_REASON = 'Any answer can show it; no question tag isolates it.';

export const SKILL_REGISTRY: readonly SkillEntry[] = [
  // ── grammar (SKILL_DEFS category "grammar") ──
  { id: 'elision', kind: 'grammar', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  { id: 'etre_avoir', kind: 'grammar', practisedBy: ['perfect'] },
  { id: 'contraction', kind: 'grammar', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  { id: 'negation', kind: 'grammar', practisedBy: ['negation'] },
  { id: 'tense_past', kind: 'grammar', practisedBy: ['perfect', 'imperfect'] },
  { id: 'tense_future', kind: 'grammar', practisedBy: ['near-future', 'simple-future'] },
  { id: 'preposition', kind: 'grammar', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  { id: 'gender', kind: 'grammar', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  { id: 'subjunctive', kind: 'grammar', practisedBy: ['subjunctive'] },
  { id: 'hypothetical', kind: 'grammar', practisedBy: ['conditional'] },
  { id: 'relative_pron', kind: 'grammar', practisedBy: [], ubiquitous: true, reason: 'Qui/que/dont fit any developed answer; no tag asks for it.' },
  { id: 'comparative', kind: 'grammar', practisedBy: ['comparison'] },
  { id: 'demonstrative', kind: 'grammar', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  // mieux/meilleur, bien/bon are what a comparison question invites.
  { id: 'confusions', kind: 'grammar', practisedBy: ['comparison'] },
  // ── lexis (SKILL_DEFS categories "structure", "vocabulary", "fluency") ──
  { id: 'word_count', kind: 'lexis', practisedBy: [], ubiquitous: true, reason: 'Answer length is shown by every answer.' },
  // A justification question asks for "parce que … donc …" chains.
  { id: 'connectors', kind: 'lexis', practisedBy: ['justification'] },
  { id: 'opinion', kind: 'lexis', practisedBy: ['opinion'] },
  // Cependant / en revanche are what a comparison question invites.
  { id: 'contrast', kind: 'lexis', practisedBy: ['comparison'] },
  { id: 'vocab_range', kind: 'lexis', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  { id: 'repetition', kind: 'lexis', practisedBy: [], ubiquitous: true, reason: UBIQUITOUS_REASON },
  { id: 'fluency_score', kind: 'lexis', practisedBy: [], notSelectable: true, reason: 'Delivery, not content: no question can be chosen to practise it.' },
  { id: 'pronunciation', kind: 'lexis', practisedBy: [], notSelectable: true, reason: 'Sounds are practised in the Pronunciation Lab, not by choosing a Learn question.' },
  // ── demands (cognitive demand of a question) ──
  { id: 'demand:describe', kind: 'demand', practisedBy: [], ubiquitous: true, reason: 'Every question asks the learner to describe something.' },
  { id: 'demand:explain', kind: 'demand', practisedBy: ['justification'] },
  { id: 'demand:justify', kind: 'demand', practisedBy: ['justification', 'opinion'] },
  { id: 'demand:compare', kind: 'demand', practisedBy: ['comparison'] },
  { id: 'demand:hypothesize', kind: 'demand', practisedBy: ['conditional'] },
  // ── exam areas (counted Exam Sim marks only, ADR 0007) ──
  { id: 'exam:rolePlay', kind: 'examArea', practisedBy: [], notSelectable: true, reason: 'Fed only by counted Exam Sim marks; practised in the Role-play drill, not Learn.' },
  { id: 'exam:communication', kind: 'examArea', practisedBy: [], notSelectable: true, reason: 'Fed only by counted Exam Sim marks.' },
  { id: 'exam:qualityOfLanguage', kind: 'examArea', practisedBy: [], notSelectable: true, reason: 'Fed only by counted Exam Sim marks.' },
];

/**
 * Structures no skill claims, each with its reason. Empty today — every
 * LearnStructure maps to at least one skill. A new structure tag must either
 * be claimed by a registry entry or be listed here (registry.test.ts).
 */
export const UNMAPPED_STRUCTURES: Readonly<Partial<Record<LearnStructure, string>>> = {};

const BY_ID: ReadonlyMap<string, SkillEntry> = new Map(SKILL_REGISTRY.map((e) => [e.id, e]));

export function skillEntry(id: string): SkillEntry | undefined {
  return BY_ID.get(id);
}

export function isRegisteredSkill(id: string): boolean {
  return BY_ID.has(id);
}

/** grammar + lexis: the skills the coach and Progress name to the learner. */
export function isLanguageSkill(id: string): boolean {
  const kind = BY_ID.get(id)?.kind;
  return kind === 'grammar' || kind === 'lexis';
}

/** A language skill a Learn session could be steered toward (not notSelectable). */
export function isSelectableSkill(id: string): boolean {
  const e = BY_ID.get(id);
  return !!e && (e.kind === 'grammar' || e.kind === 'lexis') && !e.notSelectable;
}

/** Generated view: skill id → structures that practise it (language skills with a non-empty `practisedBy`). */
export const REGISTRY_SKILL_TO_STRUCTURES: Readonly<Record<string, readonly LearnStructure[]>> = Object.freeze(
  Object.fromEntries(
    SKILL_REGISTRY
      .filter((e) => (e.kind === 'grammar' || e.kind === 'lexis') && e.practisedBy.length > 0)
      .map((e) => [e.id, e.practisedBy]),
  ),
);

/** Generated view: structure → every skill (any kind) a question with that tag can give evidence on. */
export const STRUCTURE_TO_SKILLS: Readonly<Record<LearnStructure, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    ALL_STRUCTURES.map((s) => [s, SKILL_REGISTRY.filter((e) => e.practisedBy.includes(s)).map((e) => e.id)]),
  ) as Record<LearnStructure, string[]>,
);

/** The question structures that practise any of these skills (deduplicated, registry view). */
export function registryStructuresForSkills(skillIds: readonly string[]): LearnStructure[] {
  const out = new Set<LearnStructure>();
  for (const id of skillIds) {
    for (const s of REGISTRY_SKILL_TO_STRUCTURES[id] ?? []) out.add(s);
  }
  return [...out];
}

/** True when a question tagged with `structures` practises at least one of `skillIds` (registry view). */
export function registryPractisesAnySkill(structures: readonly string[], skillIds: readonly string[]): boolean {
  if (skillIds.length === 0 || structures.length === 0) return false;
  return registryStructuresForSkills(skillIds).some((s) => structures.includes(s));
}

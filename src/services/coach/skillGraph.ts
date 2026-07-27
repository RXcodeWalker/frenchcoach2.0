// ── Coach MVP: minimal skill graph ─────────────────────────────────────────────
// A static, lookup-only graph seeded from the diagnostic engine's SKILL_DEFS.
// Node IDs are identical to diagnostic skill IDs so beliefs, evidence, and
// recommendations all speak the same vocabulary. No traversal in the MVP.

import { QUESTIONS } from '../../data/gameData';
import { inferQuestionMetadata } from '../content/questionMetadata';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import {
  nodeForIssueCategory,
  nodeForGrammarTheme,
  isSkillNode,
} from '../../domain/igcse/evidence/framework/nodeMap';
import type { Question } from '../../types';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';

export interface SkillNode {
  id: string;
  label: string;
  category: string;
  desc: string;
}

export function getSkillNodes(): SkillNode[] {
  return Object.entries(SKILL_DEFS).map(([id, def]) => ({
    id,
    label: def.name,
    category: def.category,
    desc: def.desc,
  }));
}

export function getSkillLabel(id: string): string {
  return SKILL_DEFS[id]?.name ?? id;
}

// nodeForIssueCategory / nodeForGrammarTheme / isSkillNode now live in the
// canonical map (domain/igcse/evidence/framework/nodeMap.ts) and are
// re-exported here so existing imports of skillGraph keep working.
export { nodeForIssueCategory, nodeForGrammarTheme, isSkillNode };

/** Questions whose inferred grammarFocus includes this diagnostic skill ID. */
export function getQuestionsPracticingSkill(skillId: string): Question[] {
  return QUESTIONS.filter(q => inferQuestionMetadata(q).grammarFocus.includes(skillId));
}

// ── Static skill graph edges ────────────────────────────────────────────────
// A small, curated, lookup-only edge table. No traversal engine — just direct
// queries used by the recommendation/decision engines and session builder.
//
// `requires`            : `source` is a prerequisite of `target`
//                         (i.e. target needs source mastered first).
// `commonlyConfusedWith`: the two skills are frequently mixed up (symmetric).
// `remediatedBy`        : every grammar node is remediated by retrieval practice
//                         (modelled via REMEDIATION_STRATEGY below, not as edges).

export type SkillEdgeType = 'requires' | 'commonlyConfusedWith';

export interface SkillEdge {
  source: string;
  target: string;
  type: SkillEdgeType;
}

export const SKILL_EDGES: SkillEdge[] = [
  // ── requires (source → target: target depends on source) ──
  { source: 'etre_avoir',  target: 'tense_past',   type: 'requires' },
  { source: 'tense_past',  target: 'tense_future', type: 'requires' },
  { source: 'tense_past',  target: 'hypothetical', type: 'requires' },
  { source: 'hypothetical',target: 'subjunctive',  type: 'requires' },
  { source: 'negation',    target: 'subjunctive',  type: 'requires' },
  { source: 'opinion',     target: 'subjunctive',  type: 'requires' },
  { source: 'gender',      target: 'demonstrative',type: 'requires' },
  { source: 'gender',      target: 'comparative',  type: 'requires' },
  { source: 'gender',      target: 'relative_pron',type: 'requires' },
  { source: 'preposition', target: 'relative_pron',type: 'requires' },
  { source: 'connectors',  target: 'contrast',     type: 'requires' },
  { source: 'elision',     target: 'contraction',  type: 'requires' },

  // ── commonlyConfusedWith (symmetric) ──
  { source: 'confusions',  target: 'comparative',  type: 'commonlyConfusedWith' },
  { source: 'etre_avoir',  target: 'tense_past',   type: 'commonlyConfusedWith' },
  { source: 'tense_past',  target: 'tense_future', type: 'commonlyConfusedWith' },
  { source: 'subjunctive', target: 'hypothetical', type: 'commonlyConfusedWith' },
  { source: 'gender',      target: 'demonstrative',type: 'commonlyConfusedWith' },
];

/** Prerequisite mastery (and confidence) below which a skill is "not ready". */
const PREREQ_MASTERY_THRESHOLD = 0.55;
/** Ignore prerequisite beliefs we have almost no evidence for. */
const PREREQ_MIN_CONFIDENCE = 0.2;

/** Skill IDs that must be reasonably mastered before `nodeId` is worthwhile. */
export function getPrerequisites(nodeId: string): string[] {
  return SKILL_EDGES
    .filter(e => e.type === 'requires' && e.target === nodeId)
    .map(e => e.source);
}

/** Skill IDs commonly confused with `nodeId` (edge is symmetric). */
export function getConfusions(nodeId: string): string[] {
  const ids = new Set<string>();
  for (const e of SKILL_EDGES) {
    if (e.type !== 'commonlyConfusedWith') continue;
    if (e.source === nodeId) ids.add(e.target);
    if (e.target === nodeId) ids.add(e.source);
  }
  return [...ids];
}

/** Grammar nodes are remediated by retrieval practice (recovery drills). */
export function getRemediation(nodeId: string): string[] {
  return SKILL_DEFS[nodeId]?.category === 'grammar' ? ['retrieval_practice'] : [];
}

/**
 * Is the learner ready to practise `nodeId`? A prerequisite blocks readiness
 * only when there is enough evidence to trust it (confidence above the floor)
 * AND its mastery is below the threshold. Prerequisites with sparse evidence do
 * not block — we let the learner attempt the skill and gather signal.
 */
export function isSkillReady(
  nodeId: string,
  snapshot: EvidenceBeliefSnapshot | null,
): { ready: boolean; blockers: string[] } {
  const prereqs = getPrerequisites(nodeId);
  if (prereqs.length === 0 || !snapshot) return { ready: true, blockers: [] };

  const blockers: string[] = [];
  for (const prereqId of prereqs) {
    const belief = snapshot.skills[prereqId];
    if (!belief) continue;                              // insufficient evidence
    if (belief.confidence < PREREQ_MIN_CONFIDENCE) continue;
    if (belief.mastery < PREREQ_MASTERY_THRESHOLD) blockers.push(prereqId);
  }
  return { ready: blockers.length === 0, blockers };
}

/**
 * For a list of target skill IDs, swap any that are blocked by a prerequisite
 * for that prerequisite. Order preserved, duplicates removed. Used so the daily
 * plan and session builder never target a skill the learner is not ready for.
 */
export function applyReadinessSubstitution(
  skillIds: string[],
  snapshot: EvidenceBeliefSnapshot | null,
): string[] {
  const out: string[] = [];
  for (const id of skillIds) {
    const { ready, blockers } = isSkillReady(id, snapshot);
    const resolved = ready || blockers.length === 0 ? id : blockers[0];
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}

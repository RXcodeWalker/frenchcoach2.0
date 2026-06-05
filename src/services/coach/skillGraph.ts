// ── Coach MVP: minimal skill graph ─────────────────────────────────────────────
// A static, lookup-only graph seeded from the diagnostic engine's SKILL_DEFS.
// Node IDs are identical to diagnostic skill IDs so beliefs, evidence, and
// recommendations all speak the same vocabulary. No traversal in the MVP.

import { QUESTIONS } from '../../data/gameData';
import { inferQuestionMetadata } from '../content/questionMetadata';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import type { IssueCategory, CoachingIssue, GrammarError, AvoidanceSignal, Question } from '../../types';

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

export function isSkillNode(id: string): boolean {
  return !!SKILL_DEFS[id];
}

export function getSkillLabel(id: string): string {
  return SKILL_DEFS[id]?.name ?? id;
}

// Maps a FeedbackV2 issue category to a diagnostic skill node id.
const ISSUE_CATEGORY_TO_NODE: Partial<Record<IssueCategory, string>> = {
  tense: 'tense_past',
  gender: 'gender',
  agreement: 'gender',
  preposition: 'preposition',
  elision: 'elision',
  auxiliary: 'etre_avoir',
  subjunctive: 'subjunctive',
  anglicism: 'vocab_range',
  vocabulary: 'vocab_range',
  connectors: 'connectors',
  pronunciation: 'pronunciation',
  rhythm: 'fluency_score',
  fluency: 'fluency_score',
  // 'grammar' is intentionally unmapped — too generic to attribute confidently.
};

export function nodeForIssueCategory(category: IssueCategory): string | null {
  return ISSUE_CATEGORY_TO_NODE[category] ?? null;
}

// Mirrors diagnosticEngine._classifyGrammarTheme for legacy GrammarError.theme strings.
export function nodeForGrammarTheme(theme: string): string | null {
  const t = (theme ?? '').toUpperCase();
  if (t.includes('ELISION')) return 'elision';
  if (t.includes('AUXILIARY')) return 'etre_avoir';
  if (t.includes('NEGATION')) return 'negation';
  if (t.includes('GENDER') || t.includes('ADJECTIVE')) return 'gender';
  if (t.includes('PREPOSITION')) return 'preposition';
  if (t.includes('SUBJUNCTIVE')) return 'subjunctive';
  if (t.includes('SI_CLAUSE')) return 'hypothetical';
  if (t.includes('RELATIVE')) return 'relative_pron';
  if (t.includes('COMPARATIVE')) return 'comparative';
  if (t.includes('DEMONSTRATIVE')) return 'demonstrative';
  if (t.includes('CONFUSION')) return 'confusions';
  if (t.includes('TENSE') || t.includes('PAST')) return 'tense_past';
  if (t.includes('FUTURE') || t.includes('CONDITIONAL')) return 'tense_future';
  return null;
}

/**
 * Resolve the set of skill node IDs implicated by a completed answer, drawn from
 * V2 issues, legacy grammar errors, and avoidance signals. De-duplicated.
 */
export function resolveTargetNodes(args: {
  issues?: CoachingIssue[];
  grammarErrors?: GrammarError[];
  avoidanceSignals?: AvoidanceSignal[];
}): string[] {
  const nodes = new Set<string>();

  for (const issue of args.issues ?? []) {
    const id = nodeForIssueCategory(issue.category);
    if (id) nodes.add(id);
  }

  for (const err of args.grammarErrors ?? []) {
    const id = nodeForGrammarTheme(err.theme ?? '');
    if (id) nodes.add(id);
  }

  for (const signal of args.avoidanceSignals ?? []) {
    if (isSkillNode(signal.skillId)) nodes.add(signal.skillId);
  }

  return [...nodes];
}

/** Questions whose inferred grammarFocus includes this diagnostic skill ID. */
export function getQuestionsPracticingSkill(skillId: string): Question[] {
  return QUESTIONS.filter(q => inferQuestionMetadata(q).grammarFocus.includes(skillId));
}

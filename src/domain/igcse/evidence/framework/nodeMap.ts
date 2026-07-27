/**
 * The single canonical observationType/issueCategory/grammarTheme → skillNodeId
 * map (i-am-building-an-cosmic-cascade.md §10.3, §10.4/Phase 2). Node ids are
 * `SKILL_DEFS` keys (src/services/coaching/diagnosticEngine.ts).
 *
 * Replaces the 3 drifting theme→skill maps:
 *   - src/services/coach/skillGraph.ts        (nodeForGrammarTheme, ISSUE_CATEGORY_TO_NODE)
 *   - src/services/coaching/diagnosticEngine.ts (_classifyGrammarTheme)
 *   - src/services/coaching/coachService.ts    (THEME_TO_CATEGORY)
 *
 * Two lookups are exposed because the app has two legacy shapes describing the
 * same fact: FeedbackV2 `IssueCategory` (a closed enum) and legacy
 * `GrammarError.theme` (a free-text theme string, e.g. "ELISION_MISSING").
 * Both resolve through this one table so they can never drift apart again.
 */

import { SKILL_DEFS } from '../../../../services/coaching/diagnosticEngine';

/**
 * Legacy FeedbackV2 `IssueCategory` → skillNodeId. `null` means "too generic
 * to attribute confidently" — never attributed to a node.
 */
export const NODE_MAP: Record<string, string | null> = {
  // Legacy IssueCategory (FeedbackV2 issues) — mirrors former
  // skillGraph.ISSUE_CATEGORY_TO_NODE.
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
  grammar: null,
};

/**
 * NOTE for Phase 3: the full §10.3 nodeMap table additionally maps concrete
 * Observation.type values (tense_detected, agreement_gender, ...) to node
 * ids, some of which reuse these same string keys with a DIFFERENT target
 * (e.g. Phase-3 `anglicism` → `confusions`, vs. the legacy IssueCategory
 * `anglicism` → `vocab_range` above). Phase 3 must not blindly merge into
 * this object — resolve the collision (e.g. namespace Observation.type keys,
 * or a second map) when those detectors are implemented. Left undone here
 * deliberately: Phase 2 has no real ObservationType producer to validate
 * against, and guessing the shape now would just be dead code Phase 3 has to
 * rewrite anyway.
 */

/**
 * Legacy `GrammarError.theme` is a free-text uppercase string (e.g.
 * "ELISION_MISSING"), matched by substring rather than exact key — mirrors the
 * matching behaviour of the two deleted implementations byte-for-byte.
 * Order matters: first match wins, same as the originals.
 */
const THEME_SUBSTRING_RULES: Array<[substring: string, nodeId: string | null]> = [
  ['ELISION', 'elision'],
  ['AUXILIARY', 'etre_avoir'],
  ['NEGATION', 'negation'],
  ['GENDER', 'gender'],
  ['ADJECTIVE', 'gender'],
  ['PREPOSITION', 'preposition'],
  ['SUBJUNCTIVE', 'subjunctive'],
  ['SI_CLAUSE', 'hypothetical'],
  ['RELATIVE', 'relative_pron'],
  ['COMPARATIVE', 'comparative'],
  ['DEMONSTRATIVE', 'demonstrative'],
  ['CONFUSION', 'confusions'],
  // diagnosticEngine._classifyGrammarTheme mapped PRONOUN -> 'grammar' (not a
  // real SKILL_DEFS key, i.e. silently dropped — the Part-1a "leak" bug).
  // skillGraph.nodeForGrammarTheme instead mapped it to 'confusions'. Since
  // 'confusions' is the real node both TENSE and PRONOUN issues should land
  // on, and the leak was a bug (not intended behaviour), we standardize on
  // 'confusions' here — fixing the leak per Part 1a / §10.3 nodeMap table.
  ['PRONOUN', 'confusions'],
  ['TENSE', 'tense_past'],
  ['PAST', 'tense_past'],
  ['FUTURE', 'tense_future'],
  ['CONDITIONAL', 'tense_future'],
];

/** Resolve a legacy FeedbackV2 `IssueCategory` to a skill node id, or null. */
export function nodeForIssueCategory(category: string): string | null {
  return NODE_MAP[category] ?? null;
}

/** Resolve a legacy `GrammarError.theme` free-text string to a skill node id. */
export function nodeForGrammarTheme(theme: string): string | null {
  const t = (theme ?? '').toUpperCase();
  for (const [substring, nodeId] of THEME_SUBSTRING_RULES) {
    if (t.includes(substring)) return nodeId;
  }
  return null;
}

export function isSkillNode(id: string): boolean {
  return !!SKILL_DEFS[id];
}

/**
 * Every non-null NODE_MAP value must be a real SKILL_DEFS key. Exported so a
 * test can assert exhaustiveness without duplicating the walk logic.
 */
export function findUnknownNodeMapTargets(): string[] {
  const unknown = new Set<string>();
  for (const nodeId of Object.values(NODE_MAP)) {
    if (nodeId && !isSkillNode(nodeId)) unknown.add(nodeId);
  }
  for (const [, nodeId] of THEME_SUBSTRING_RULES) {
    if (nodeId && !isSkillNode(nodeId)) unknown.add(nodeId);
  }
  return [...unknown];
}

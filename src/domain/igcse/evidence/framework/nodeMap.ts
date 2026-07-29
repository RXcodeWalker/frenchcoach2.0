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
 * Phase 3 (§10.3): the concrete Observation.type → skillNodeId table, kept as
 * a SEPARATE map from NODE_MAP (not merged) precisely because of the
 * collision flagged above — Phase-3 `anglicism` → `confusions` here, vs. the
 * legacy IssueCategory `anglicism` → `vocab_range` in NODE_MAP. Both maps are
 * correct for their own input vocabulary; a caller must know which shape it
 * has (Observation.type vs legacy IssueCategory/GrammarError.theme) and call
 * the matching resolver.
 */
export const OBSERVATION_TYPE_NODE_MAP: Record<string, string | null> = {
  tense_detected: 'tense_past', // overridden per-observation to tense_future by nodeForObservation (time-frame prefix)
  tense_missing: 'tense_past',
  tense_inconsistent: 'tense_past',
  agreement_gender: 'gender',
  agreement_number: 'gender',
  article_error: 'gender',
  contraction_error: 'contraction',
  elision_error: 'elision',
  negation_incomplete: 'negation',
  auxiliary_error: 'etre_avoir',
  preposition_error: 'preposition',
  anglicism: 'confusions',
  pronoun_placement: 'confusions',
  interrogation_form: 'confusions',
  subjunctive_missing: 'subjunctive',
  hypothetical_form: 'hypothetical',
  relative_pronoun: 'relative_pron',
  comparative_form: 'comparative',
  demonstrative_error: 'demonstrative',
  connector_used: 'connectors',
  lexeme_rare: 'vocab_range',
  expected_vocab_hit: 'vocab_range',
  repetition: 'repetition',
  filler: 'fluency_score',
  self_correction: 'fluency_score',
  // Feature-only, never attributed to a node.
  sentence: null,
  lexeme: null,
  verb: null,
  complex_sentence: null,
  lexical_density: null,
  complexity_ratio: null,
  tense_range: null,
  response_count: null,
  topic_duration: null,
  role_play_part: null,
  time_frame_alignment: null,
  expected_structure_hit: null,
  // avoidance carries its own skillNodeId set directly on the observation by
  // the detector (tense_past/tense_future) — never resolved through this map.
  avoidance: null,
};

/**
 * Resolve a Phase-3 Observation to a skill node id. `tense_detected`/
 * `tense_missing`/`tense_inconsistent` need the observation's own `value`
 * (which carries the time-frame prefix, e.g. "future:futur_simple:irai") to
 * distinguish tense_past from tense_future — a single static table entry
 * can't express that, hence this function over a plain lookup.
 */
export function nodeForObservationType(type: string, value?: string | number | boolean): string | null {
  if (
    (type === 'tense_detected' || type === 'tense_inconsistent') &&
    typeof value === 'string' &&
    (value.startsWith('future') || value.startsWith('conditional'))
  ) {
    return 'tense_future';
  }
  return OBSERVATION_TYPE_NODE_MAP[type] ?? null;
}

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
 * Every non-null NODE_MAP/OBSERVATION_TYPE_NODE_MAP value must be a real
 * SKILL_DEFS key. Exported so a test can assert exhaustiveness without
 * duplicating the walk logic.
 */
export function findUnknownNodeMapTargets(): string[] {
  const unknown = new Set<string>();
  for (const nodeId of Object.values(NODE_MAP)) {
    if (nodeId && !isSkillNode(nodeId)) unknown.add(nodeId);
  }
  for (const [, nodeId] of THEME_SUBSTRING_RULES) {
    if (nodeId && !isSkillNode(nodeId)) unknown.add(nodeId);
  }
  for (const nodeId of Object.values(OBSERVATION_TYPE_NODE_MAP)) {
    if (nodeId && !isSkillNode(nodeId)) unknown.add(nodeId);
  }
  return [...unknown];
}

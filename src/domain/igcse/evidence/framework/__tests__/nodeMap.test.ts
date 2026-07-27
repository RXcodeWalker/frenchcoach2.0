// ── Phase 2 canonical nodeMap tests ────────────────────────────────────────
// Hard gate: every non-null NODE_MAP / theme-substring target must resolve to
// a real SKILL_DEFS key, so no observation can silently vanish into an
// unknown node (the exact "grammar-leak" bug this map replaces — Part 1a).

import { describe, it, expect } from 'vitest';
import {
  NODE_MAP,
  nodeForIssueCategory,
  nodeForGrammarTheme,
  isSkillNode,
  findUnknownNodeMapTargets,
} from '../nodeMap';
import { SKILL_DEFS } from '../../../../../services/coaching/diagnosticEngine';

describe('nodeMap exhaustiveness', () => {
  it('every non-null NODE_MAP value is a real SKILL_DEFS key', () => {
    expect(findUnknownNodeMapTargets()).toEqual([]);
  });

  it('every non-null value returned by nodeForIssueCategory is a real skill node', () => {
    for (const category of Object.keys(NODE_MAP)) {
      const nodeId = nodeForIssueCategory(category);
      if (nodeId !== null) expect(isSkillNode(nodeId)).toBe(true);
    }
  });

  it('unknown categories resolve to null, not a dropped exception', () => {
    expect(nodeForIssueCategory('not-a-real-category')).toBeNull();
  });
});

describe('nodeForGrammarTheme', () => {
  it('resolves every documented theme substring to a real SKILL_DEFS key', () => {
    const themes = [
      'ELISION_MISSING', 'AUXILIARY_WRONG', 'NEGATION_INCOMPLETE',
      'GENDER_MISMATCH', 'ADJECTIVE_AGREEMENT', 'PREPOSITION_WRONG',
      'SUBJUNCTIVE_MISSING', 'SI_CLAUSE_SEQUENCE', 'RELATIVE_PRONOUN',
      'COMPARATIVE_FORM', 'DEMONSTRATIVE_ERROR', 'CONFUSION_BIEN_BON',
      'PRONOUN_PLACEMENT', 'TENSE_WRONG', 'PAST_TENSE_MISSING',
      'FUTURE_TENSE', 'CONDITIONAL_FORM',
    ];
    for (const theme of themes) {
      const nodeId = nodeForGrammarTheme(theme);
      expect(nodeId, `theme "${theme}" resolved to ${nodeId}`).not.toBeNull();
      expect(isSkillNode(nodeId!)).toBe(true);
    }
  });

  it('the PRONOUN leak bug is fixed: PRONOUN now resolves to a real node, not silently dropped', () => {
    // diagnosticEngine._classifyGrammarTheme (pre-Phase-2) mapped PRONOUN to
    // 'grammar', which is not a SKILL_DEFS key — the observation vanished.
    const nodeId = nodeForGrammarTheme('PRONOUN_PLACEMENT_ERROR');
    expect(nodeId).not.toBeNull();
    expect(nodeId).not.toBe('grammar');
    expect(isSkillNode(nodeId!)).toBe(true);
  });

  it('an unrecognised theme resolves to null rather than throwing', () => {
    expect(nodeForGrammarTheme('SOME_UNKNOWN_THEME')).toBeNull();
  });

  it('is case-insensitive and matches by substring, mirroring the deleted implementations', () => {
    expect(nodeForGrammarTheme('elision_missing')).toBe('elision');
    expect(nodeForGrammarTheme('elisionmissing')).toBe('elision');
  });
});

describe('isSkillNode / SKILL_DEFS agreement', () => {
  it('every SKILL_DEFS key is recognised by isSkillNode', () => {
    for (const id of Object.keys(SKILL_DEFS)) {
      expect(isSkillNode(id)).toBe(true);
    }
  });

  it('a made-up id is not a skill node', () => {
    expect(isSkillNode('definitely-not-a-node')).toBe(false);
  });
});

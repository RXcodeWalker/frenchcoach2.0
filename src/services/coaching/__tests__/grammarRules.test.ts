// ── Phase 1, Slice 1: regression tests locking in target GRAMMAR_RULES/
// TEACHME_LIBRARY behavior BEFORE Slices 2-4 touch coachService.ts.
//
// Test-authoring strategy (user-confirmed): assertions target POST-FIX
// behavior for the 5 rules with a documented bug (rel_qui_subj,
// pron_placement, prep_ecouter_a, si_clause, passe-compose false-praise) —
// these are RED until Slices 2-4 land, acting as a checklist. adj_plural has
// no bug (just narrow recall) — its assertions pin CURRENT accepted scope.

import { describe, it, expect } from 'vitest';
import { GRAMMAR_RULES, TEACHME_LIBRARY } from '../coachService';

function fires(id: string, transcript: string): boolean {
  const rule = GRAMMAR_RULES.find(r => r.id === id);
  if (!rule) return false;
  return rule.test(transcript);
}

describe('rel_qui_subj (post-fix: prepositional "qui" excluded)', () => {
  it('does not flag prepositional relative clauses', () => {
    expect(fires('rel_qui_subj', "l'ami avec qui je joue")).toBe(false);
    expect(fires('rel_qui_subj', 'la personne a qui je parle')).toBe(false);
    expect(fires('rel_qui_subj', 'la personne avec qui je travaille')).toBe(false);
    expect(fires('rel_qui_subj', "l'ami chez qui je loge")).toBe(false);
  });

  it('still flags a bare non-prepositional "qui + subject pronoun" construction', () => {
    // TEACHME_LIBRARY['rel_qui_subj'] explains: qui introduces a relative
    // clause where the pronoun is the SUBJECT; if a personal pronoun follows
    // qui directly (no preposition), that's the error this rule targets.
    expect(fires('rel_qui_subj', 'le film qui je regarde')).toBe(true);
  });
});

describe('pron_placement (post-fix: le|la|les dropped from the alternation)', () => {
  it('does not flag correct direct-object placement using le/la/les', () => {
    expect(fires('pron_placement', 'il regarde la television')).toBe(false);
    expect(fires('pron_placement', 'je vois le chat')).toBe(false);
    expect(fires('pron_placement', 'elle ecoute la radio')).toBe(false);
  });

  it('still flags misplacement using the retained pronouns (lui/leur/me/te/nous/vous)', () => {
    expect(fires('pron_placement', 'je vois lui')).toBe(true);
  });
});

describe('prep_ecouter_a (post-fix: ecouter-only, chercher/attendre dropped)', () => {
  it('does not flag chercher/attendre with a preposition', () => {
    expect(fires('prep_ecouter_a', 'je vais chercher pour mes clés')).toBe(false);
    expect(fires('prep_ecouter_a', "il faut attendre pour le bus")).toBe(false);
  });

  it('still flags ecouter with a preposition', () => {
    // Also exercises the Slice 2 fix for a pre-existing \b/accent-boundary
    // bug: JS \b is ASCII-only, so a literal à immediately against \b never
    // matched (discovered during Slice 1 test-writing; user-confirmed to fix
    // in the same slice since it already touches this rule's regex).
    expect(fires('prep_ecouter_a', 'je vais écouter à la radio')).toBe(true);
  });

  it('TEACHME_LIBRARY explanation no longer mentions chercher/attendre once the rule is narrowed', () => {
    const entry = TEACHME_LIBRARY['prep_ecouter_a'];
    const text = `${entry?.why ?? ''} ${entry?.examples?.map(e => e.en).join(' ') ?? ''}`;
    expect(text).not.toMatch(/chercher/i);
    expect(text).not.toMatch(/attendre/i);
  });
});

describe('si_clause (post-fix: adjacency removed, duplicate alternative removed, wider person coverage)', () => {
  it('still flags future tense instead of conditional after an imperfect si clause', () => {
    expect(fires('si_clause', "si j'etais riche, j'acheterai un bateau")).toBe(true);
  });

  it('does not flag a correct imparfait + conditional construction (adjacency fix allows evaluation of comma-separated sentences)', () => {
    expect(fires('si_clause', "si j'avais de l'argent, j'acheterais une voiture")).toBe(false);
  });
});

describe('adj_plural (no bug — scope-limited, documented current behavior)', () => {
  it('catches the hardcoded whitelist case (missing plural -s)', () => {
    expect(fires('adj_plural', 'mes amis intelligent')).toBe(true);
  });

  it('does NOT catch a determiner/noun pair outside the hardcoded whitelist (accepted current scope, not a regression to fix)', () => {
    expect(fires('adj_plural', 'mes copains fatigue')).toBe(false);
  });
});

describe('passe-compose false-praise (_findStrongestMoment, post-fix denylist)', () => {
  it('does not praise "du" (partitive) as a passé composé participle', async () => {
    const { evaluate } = await import('../coachService');
    const question = { id: 'q1', topicKey: 'school', text: 'Q', difficulty: 2 } as import('../../../types').Question;
    const result = evaluate("j'ai du temps libre", question);
    // The false positive would surface as a strongestMomentExplanation
    // specifically praising this phrase as correct passé composé usage
    // (category: 'tense', "shows correct use of the passé composé"). Falling
    // through to a different, legitimate praise reason (e.g. the
    // clear-communication fallback) is fine and expected post-fix.
    expect(result.strongestMomentExplanation ?? '').not.toMatch(/passé composé/i);
  });

  it('still praises genuine passé composé', async () => {
    const { evaluate } = await import('../coachService');
    const question = { id: 'q1', topicKey: 'school', text: 'Q', difficulty: 2 } as import('../../../types').Question;
    const result = evaluate("j'ai mange une pomme hier et c'etait delicieux vraiment beaucoup", question);
    expect(result.strongestMomentSpan).toBeDefined();
  });
});

describe('rel_que_verb deletion', () => {
  it('the rule id no longer exists in GRAMMAR_RULES', () => {
    expect(GRAMMAR_RULES.find(r => r.id === 'rel_que_verb')).toBeUndefined();
  });

  it('neither example sentence produces a rel_que_verb-tagged issue', () => {
    const stillFlagged = (t: string) =>
      GRAMMAR_RULES.some(r => r.id === 'rel_que_verb' && r.test(t));
    expect(stillFlagged('le livre que lit mon frere')).toBe(false);
    expect(stillFlagged('quelque chose que est interessant')).toBe(false);
  });
});

describe('general non-regression: no relative-clause rule misfires on inverted-subject "que"', () => {
  it('"ce que fait mon pere" does not flag under any relative-clause rule', () => {
    const relRules = GRAMMAR_RULES.filter(r => r.theme === 'RELATIVE');
    expect(relRules.some(r => r.test('ce que fait mon pere'))).toBe(false);
  });
});

describe('con_au (\\b/accent-boundary bug fix, Slice 2c — untouched by any other planned slice)', () => {
  it('flags "à le"/"à les" (previously silently never fired due to a leading \\b against à)', () => {
    expect(fires('con_au', 'je vais à le marché')).toBe(true);
    expect(fires('con_au', 'il parle à les professeurs')).toBe(true);
  });
});

describe('aux_aller (\\b/accent-boundary bug fix, bundled into Slice 5/8)', () => {
  it('flags "j\'ai allé" (previously silently never fired due to a trailing \\b against é)', () => {
    expect(fires('aux_aller', "j'ai allé au marché")).toBe(true);
  });
});

describe('unsourced examiner statistic removed', () => {
  it('aux_aller examinerNote does not contain a bare percentage', () => {
    expect(TEACHME_LIBRARY.aux_aller?.examinerNote ?? '').not.toMatch(/\d+%/);
  });
});

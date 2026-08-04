// ── Acceptance corpus (Part III, verbatim — accented). Each NO_ERROR
// sentence must produce no issue from ANY rule, not just the rule it was
// originally written to exercise: asserting narrowly (e.g. only against
// rel_qui_subj) is how "mes parents français" previously slipped through
// adj_plural undetected. Each STILL_FLAGGED sentence must still fire under
// its documented rule after the regexBoundary.ts accent-safety fixes.

import { describe, it, expect } from 'vitest';
import { GRAMMAR_RULES, TEACHME_LIBRARY } from '../coachService';

function fires(id: string, transcript: string): boolean {
  const rule = GRAMMAR_RULES.find(r => r.id === id);
  if (!rule) return false;
  return rule.test(transcript);
}

function firedRuleIds(transcript: string): string[] {
  return GRAMMAR_RULES.filter(r => r.test(transcript)).map(r => r.id);
}

export const NO_ERROR = [
  'il regarde la télé',
  'elle écoute la radio',
  'mes parents français',
  "l'ami avec qui je joue",
  'la personne à qui je parle',
  'je cherche à comprendre',
  'ce que fait mon père',
];

export const STILL_FLAGGED = [
  "c'est le film qui j'ai vu",
  'je vois lui',
  "j'écoute à la radio",
  "si j'étais riche, j'achèterai un bateau",
];

describe('NO_ERROR corpus — no rule fires on any correct sentence', () => {
  it.each(NO_ERROR)('%s', (sentence) => {
    expect(firedRuleIds(sentence)).toEqual([]);
  });
});

describe('STILL_FLAGGED corpus — genuine errors are still caught', () => {
  it('"c\'est le film qui j\'ai vu" is flagged (rel_qui_subj)', () => {
    expect(fires('rel_qui_subj', STILL_FLAGGED[0])).toBe(true);
  });

  it('"je vois lui" is flagged (pron_placement)', () => {
    expect(fires('pron_placement', STILL_FLAGGED[1])).toBe(true);
  });

  it('"j\'écoute à la radio" is flagged (prep_ecouter_a)', () => {
    expect(fires('prep_ecouter_a', STILL_FLAGGED[2])).toBe(true);
  });

  it('"si j\'étais riche, j\'achèterai un bateau" is flagged (si_clause — future instead of conditional)', () => {
    expect(fires('si_clause', STILL_FLAGGED[3])).toBe(true);
  });
});

describe('§2 boundary-bug cases — accented inputs, verbatim', () => {
  it('rel_qui_subj: does not flag prepositional relative clauses (accented à)', () => {
    expect(fires('rel_qui_subj', 'la personne à qui je parle')).toBe(false);
    expect(fires('rel_qui_subj', "l'ami avec qui je joue")).toBe(false);
    expect(fires('rel_qui_subj', 'la personne avec qui je travaille')).toBe(false);
    expect(fires('rel_qui_subj', "l'ami chez qui je loge")).toBe(false);
  });

  it('rel_qui_subj: still flags a bare non-prepositional "qui + subject pronoun" construction', () => {
    expect(fires('rel_qui_subj', "c'est le film qui j'ai vu")).toBe(true);
  });

  it('rel_qui_subj: nested lookbehind does not suppress a relative clause on a word ending in "de "', () => {
    // "monde" ends in "de " — a naive (non-nested) fix would wrongly treat
    // this as the "de qui" prepositional case and suppress a genuine error.
    expect(fires('rel_qui_subj', 'le monde qui je vois')).toBe(true);
  });

  it('prep_ecouter_a: flags écouter à across conjugations, not just the infinitive', () => {
    expect(fires('prep_ecouter_a', "j'écoute à la radio")).toBe(true);
    expect(fires('prep_ecouter_a', 'nous écoutons à la radio')).toBe(true);
    expect(fires('prep_ecouter_a', 'je vais écouter à la radio')).toBe(true);
  });

  it('prep_ecouter_a: does not flag unrelated verbs or écouter without a preposition', () => {
    expect(fires('prep_ecouter_a', 'je cherche à comprendre')).toBe(false);
    expect(fires('prep_ecouter_a', "j'écoute la radio")).toBe(false);
  });

  it('el_le_la: flags accented vowel-initial nouns after le/la', () => {
    expect(fires('el_le_la', 'le école')).toBe(true);
    expect(fires('el_le_la', 'la université')).toBe(true);
  });

  it('el_de: flags accented vowel-initial nouns after de', () => {
    expect(fires('el_de', 'de université')).toBe(true);
  });

  it('dem_cet: flags accented vowel-initial nouns after ce', () => {
    expect(fires('dem_cet', 'ce été')).toBe(true);
  });

  it('adj_plural: does not flag français/anglais in the masculine plural (already correct — no -s)', () => {
    expect(fires('adj_plural', 'mes parents français')).toBe(false);
  });

  it('adj_plural: still flags the hardcoded whitelist case (missing plural -s)', () => {
    expect(fires('adj_plural', 'mes amis intelligent')).toBe(true);
  });

  it('adj_plural: does NOT catch a determiner/noun pair outside the hardcoded whitelist (accepted current scope)', () => {
    expect(fires('adj_plural', 'mes copains fatigue')).toBe(false);
  });

  it('neg_missing_ne: flags the elided j\' alternative (previously unreachable — required a space after j\')', () => {
    expect(fires('neg_missing_ne', "j'ai pas de frères")).toBe(true);
    expect(fires('neg_missing_ne', 'je suis pas content')).toBe(true);
  });

  it('neg_missing_ne: does not flag correctly formed negation', () => {
    expect(fires('neg_missing_ne', 'je ne suis pas content')).toBe(false);
  });
});

describe('pron_placement (le|la|les excluded from the alternation)', () => {
  it('does not flag correct direct-object placement using le/la/les', () => {
    expect(fires('pron_placement', 'il regarde la television')).toBe(false);
    expect(fires('pron_placement', 'je vois le chat')).toBe(false);
    expect(fires('pron_placement', 'elle ecoute la radio')).toBe(false);
  });

  it('still flags misplacement using the retained pronouns (lui/leur/me/te/nous/vous)', () => {
    expect(fires('pron_placement', 'je vois lui')).toBe(true);
  });
});

describe('prep_ecouter_a: TEACHME_LIBRARY explanation no longer mentions chercher/attendre', () => {
  it('does not mention the dropped verbs', () => {
    const entry = TEACHME_LIBRARY['prep_ecouter_a'];
    const text = `${entry?.why ?? ''} ${entry?.examples?.map(e => e.en).join(' ') ?? ''}`;
    expect(text).not.toMatch(/chercher/i);
    expect(text).not.toMatch(/attendre/i);
  });
});

describe('si_clause (adjacency removed, duplicate alternative removed, wider person coverage)', () => {
  it('still flags future tense instead of conditional after an imperfect si clause', () => {
    expect(fires('si_clause', "si j'etais riche, j'acheterai un bateau")).toBe(true);
  });

  it('does not flag a correct imparfait + conditional construction (adjacency fix allows evaluation of comma-separated sentences)', () => {
    expect(fires('si_clause', "si j'avais de l'argent, j'acheterais une voiture")).toBe(false);
  });
});

describe('passe-compose false-praise (_findStrongestMoment, denylist)', () => {
  it('does not praise "du" (partitive) as a passé composé participle', async () => {
    const { evaluate } = await import('../coachService');
    const question = { id: 'q1', topicKey: 'school', text: 'Q', difficulty: 2 } as import('../../../types').Question;
    const result = evaluate("j'ai du temps libre", question);
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

describe('con_au (accent-boundary bug fix)', () => {
  it('flags "à le"/"à les" (previously silently never fired due to a leading \\b against à)', () => {
    expect(fires('con_au', 'je vais à le marché')).toBe(true);
    expect(fires('con_au', 'il parle à les professeurs')).toBe(true);
  });
});

describe('aux_aller (accent-boundary bug fix)', () => {
  it('flags "j\'ai allé" (previously silently never fired due to a trailing \\b against é)', () => {
    expect(fires('aux_aller', "j'ai allé au marché")).toBe(true);
  });
});

describe('unsourced examiner statistic removed', () => {
  it('aux_aller examinerNote does not contain a bare percentage', () => {
    expect(TEACHME_LIBRARY.aux_aller?.examinerNote ?? '').not.toMatch(/\d+%/);
  });
});

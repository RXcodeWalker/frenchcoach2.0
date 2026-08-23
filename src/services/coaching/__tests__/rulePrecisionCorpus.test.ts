// Stage 4 item 1 (docs/architecture — Learn-mode coach feedback plan): a
// precision corpus for the 22 offline GRAMMAR_RULES, separate from
// grammarRules.test.ts's smaller per-rule spot-checks. This file reports
// precision/recall over a larger labelled corpus and gates future rule work —
// "no new rule lands without demonstrated precision on that corpus" — by
// asserting a minimum bar on the current rule set. A false correction is
// worse than a missing one (docs Stage 4 preamble), so precision is the
// metric that must never regress.
//
// Each FIRE case names the rule id it is written to exercise and must fire
// under that id specifically (recall). Each SILENT case is representative
// correct French drawn from context genuinely adjacent to what could
// misfire — plural adjectives, prepositional relative clauses, elided
// articles used correctly, etc. — and must produce NO issue from ANY rule,
// not just the one it targets (precision): asserting narrowly is how
// cross-rule false positives previously slipped through undetected
// (grammarRules.test.ts's header comment documents one such case).

import { describe, it, expect } from 'vitest';
import { GRAMMAR_RULES } from '../coachService';

interface FireCase {
  ruleId: string;
  transcript: string;
}

interface SilentCase {
  /** Documents which rule's false-positive this guards against; informational only. */
  guards: string;
  transcript: string;
}

// ── FIRE corpus: one representative genuine error per rule, at minimum ───────
const FIRE_CASES: FireCase[] = [
  { ruleId: 'el_je', transcript: 'je aime le foot' },
  { ruleId: 'el_je', transcript: "je n'aime pas mais je adore le tennis" },
  { ruleId: 'el_le_la', transcript: "je vais à la école demain" },
  { ruleId: 'el_le_la', transcript: 'le hôtel est très cher' },
  { ruleId: 'el_de', transcript: "j'ai besoin de un ami" },
  { ruleId: 'el_de', transcript: "je viens de une école privée" },
  { ruleId: 'el_que', transcript: 'je pense que il a raison' },
  { ruleId: 'el_que', transcript: 'il faut que elle vienne' },
  { ruleId: 'con_au', transcript: 'je vais à le marché' },
  { ruleId: 'con_au', transcript: 'il parle à les professeurs' },
  { ruleId: 'con_du', transcript: "je reviens de le collège" },
  { ruleId: 'con_du', transcript: "c'est le livre de les eleves" },
  { ruleId: 'aux_aller', transcript: "j'ai allé au marché hier" },
  { ruleId: 'aux_aller', transcript: "hier j'ai allé à Paris avec ma famille" },
  { ruleId: 'aux_venir', transcript: "j'ai venu chez toi hier soir" },
  { ruleId: 'gen_probleme', transcript: "la problème est difficile à résoudre" },
  { ruleId: 'adj_plural', transcript: 'mes amis intelligent sont sympa' },
  { ruleId: 'adj_plural', transcript: 'mes parents content de mes notes' },
  { ruleId: 'ang_age', transcript: "je suis 16 ans et j'habite à Paris" },
  { ruleId: 'ang_faim_soif', transcript: 'je suis faim après le sport' },
  { ruleId: 'ang_faim_soif', transcript: 'je suis froid dans cette salle' },
  // prep_jouer only matches the infinitive "jouer", not conjugated "joue" —
  // documented current scope, not expanded here (item 1 is corpus-only).
  { ruleId: 'prep_jouer', transcript: "j'aime jouer le football chaque semaine" },
  { ruleId: 'prep_ecouter_a', transcript: "j'écoute à la radio le matin" },
  { ruleId: 'subj_il_faut', transcript: 'il faut que je vais au collège' },
  { ruleId: 'si_clause', transcript: "si j'avais de l'argent, j'acheterai une voiture" },
  { ruleId: 'pron_placement', transcript: 'je vois lui au parc chaque jour' },
  { ruleId: 'neg_missing_ne', transcript: "je suis pas content de mes résultats" },
  { ruleId: 'neg_missing_ne', transcript: "j'ai pas de frères ni de sœurs" },
  { ruleId: 'rel_qui_subj', transcript: "c'est le film qui j'ai vu hier soir" },
  { ruleId: 'comp_meilleur', transcript: 'ce restaurant est plus bon que l\'autre' },
  { ruleId: 'comp_mieux', transcript: 'je parle plus bien que mon frère' },
  { ruleId: 'dem_cet', transcript: 'ce hôtel est vraiment magnifique' },
];

// ── SILENT corpus: correct French adjacent to what each rule pattern-matches ─
const SILENT_CASES: SilentCase[] = [
  { guards: 'el_je', transcript: "j'aime le foot et j'adore le tennis" },
  { guards: 'el_le_la', transcript: "je vais à l'école demain" },
  { guards: 'el_le_la', transcript: "l'hôtel est très cher" },
  { guards: 'el_de', transcript: "j'ai besoin d'un ami" },
  { guards: 'el_que', transcript: "je pense qu'il a raison" },
  { guards: 'con_au', transcript: 'je vais au marché' },
  { guards: 'con_au', transcript: 'il parle aux professeurs' },
  { guards: 'con_du', transcript: 'je reviens du collège' },
  { guards: 'aux_aller', transcript: 'je suis allé au marché hier' },
  { guards: 'aux_venir', transcript: 'je suis venu chez toi hier soir' },
  { guards: 'gen_probleme', transcript: 'le problème est difficile à résoudre' },
  // adj_plural: masculine-plural adjectives already correct with no -s must
  // not be flagged (français/anglais deliberately excluded — see coachService.ts).
  { guards: 'adj_plural', transcript: 'mes amis français sont sympa' },
  { guards: 'adj_plural', transcript: 'mes parents anglais habitent à Londres' },
  { guards: 'ang_age', transcript: "j'ai 16 ans et j'habite à Paris" },
  { guards: 'ang_faim_soif', transcript: "j'ai faim après le sport" },
  { guards: 'prep_jouer', transcript: 'je joue au football chaque semaine' },
  { guards: 'prep_ecouter_a', transcript: "j'écoute la radio le matin" },
  { guards: 'prep_ecouter_a', transcript: 'je cherche à comprendre la leçon' },
  { guards: 'subj_il_faut', transcript: 'il faut que je fasse mes devoirs' },
  { guards: 'si_clause', transcript: "si j'avais de l'argent, j'achèterais une voiture" },
  // pron_placement: le/la/les are deliberately excluded from the flagged
  // alternation — direct-object pronoun placement using them is correct.
  { guards: 'pron_placement', transcript: 'il regarde la télévision le soir' },
  { guards: 'pron_placement', transcript: 'je vois le chat dans le jardin' },
  { guards: 'neg_missing_ne', transcript: 'je ne suis pas content de mes résultats' },
  // rel_qui_subj: prepositional relative clauses ("à qui", "avec qui",
  // "chez qui", "de qui") must not be mistaken for the bare subject case.
  { guards: 'rel_qui_subj', transcript: 'la personne à qui je parle est ma tante' },
  { guards: 'rel_qui_subj', transcript: "l'ami avec qui je joue habite à côté" },
  { guards: 'rel_qui_subj', transcript: "l'ami chez qui je loge est très gentil" },
  { guards: 'comp_meilleur', transcript: 'ce restaurant est meilleur que l\'autre' },
  { guards: 'comp_mieux', transcript: 'je parle mieux que mon frère' },
  { guards: 'dem_cet', transcript: 'cet hôtel est vraiment magnifique' },
  // Generic clean sentences with no targeted rule — broad coverage against
  // any-rule false positives on ordinary correct French.
  { guards: 'general', transcript: 'il regarde la télé tous les soirs avec sa famille' },
  { guards: 'general', transcript: "j'aime beaucoup lire des romans historiques" },
  { guards: 'general', transcript: 'ce que fait mon père le week-end est intéressant' },
  { guards: 'general', transcript: "nous avons mangé au restaurant hier soir" },
];

function firedRuleIds(transcript: string): string[] {
  return GRAMMAR_RULES.filter(r => r.test(transcript)).map(r => r.id);
}

describe('Rule precision corpus (docs Stage 4 item 1)', () => {
  it.each(FIRE_CASES)('recall: $ruleId fires on "$transcript"', ({ ruleId, transcript }) => {
    expect(firedRuleIds(transcript)).toContain(ruleId);
  });

  it.each(SILENT_CASES)('precision: no rule fires on "$transcript" (guards $guards)', ({ transcript }) => {
    expect(firedRuleIds(transcript)).toEqual([]);
  });

  it('every current GRAMMAR_RULES id has at least one FIRE_CASES entry', () => {
    const covered = new Set(FIRE_CASES.map(c => c.ruleId));
    const uncovered = GRAMMAR_RULES.map(r => r.id).filter(id => !covered.has(id));
    expect(uncovered).toEqual([]);
  });

  it('reports aggregate precision and recall over the corpus', () => {
    let truePositives = 0; // FIRE case: target rule fired
    let falseNegatives = 0; // FIRE case: target rule did not fire
    let falsePositives = 0; // SILENT case: any rule fired (should have stayed silent)
    let trueNegatives = 0; // SILENT case: no rule fired

    for (const { ruleId, transcript } of FIRE_CASES) {
      if (firedRuleIds(transcript).includes(ruleId)) truePositives++;
      else falseNegatives++;
    }
    for (const { transcript } of SILENT_CASES) {
      if (firedRuleIds(transcript).length > 0) falsePositives++;
      else trueNegatives++;
    }

    const precision = truePositives / (truePositives + falsePositives);
    const recall = truePositives / (truePositives + falseNegatives);

    // Baseline floor for the current 22 rules — a new rule that drops either
    // metric below this bar must not land without investigation (docs Stage 4
    // item 1: "no new rule lands without demonstrated precision").
    expect(precision).toBeGreaterThanOrEqual(0.95);
    expect(recall).toBeGreaterThanOrEqual(0.95);
    expect(trueNegatives + falsePositives).toBe(SILENT_CASES.length);
  });
});

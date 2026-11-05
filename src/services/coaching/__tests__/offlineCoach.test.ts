// The smarter offline coach (the fallback when AI feedback is unavailable,
// and what a guest gets after their free AI answers): every occurrence of an
// error, exact corrections, quoted strengths, self-corrections, English words
// and next steps for the question. Rule precision lives in
// rulePrecisionCorpus.test.ts; this file covers what evaluate() builds.
import { describe, it, expect } from 'vitest';
import { evaluate, GRAMMAR_RULES } from '../coachService';
import { claimMentionsMarkOrBand } from '../../../domain/examFeedback/shared/markClaimFilter';
import { STRENGTH_WHY } from '../offline/strengths';
import { NEXT_STEP_COPY } from '../offline/nextSteps';
import { checkEnglish } from '../offline/englishCheck';
import type { Question } from '../../../types';

const base: Question = {
  id: 'q1',
  topicKey: 'family',
  text: 'Parle-moi de ta famille.',
  hint: '',
  difficulty: 2,
  followUps: [],
  modelAnswer: "J'habite avec ma mère et mon frère. Ma mère est très gentille.",
  keyVocab: [],
};

const withDemands = (timeFrames: string[]): Question =>
  ({
    ...base,
    demands: {
      cognitiveDemand: 'describe',
      timeFrames,
      structures: ['opinion'],
      responseLoad: 'developed',
      lexicalReach: 'everyday',
      sufficientAnswer: '',
      provenance: 'inferred',
    },
  }) as unknown as Question;

function rewrite(id: string, text: string): string | null {
  const rule = GRAMMAR_RULES.find((r) => r.id === id);
  const span = rule?.capture?.(text);
  if (!rule?.rewrite || !span) return null;
  return text.slice(0, span.start) + rule.rewrite(span.text) + text.slice(span.end);
}

describe('every occurrence of an error is caught', () => {
  it('lists a repeated slip each time and fixes every copy in the improved answer', () => {
    const r = evaluate("je aime le sport et je aime aussi la musique avec mes amis le samedi", base);
    const elisions = (r.issues ?? []).filter((i) => i.id.startsWith('el_je'));
    expect(elisions.map((i) => i.id)).toEqual(['el_je', 'el_je:2']);
    expect(r.improved_answer).toBe("j'aime le sport et j'aime aussi la musique avec mes amis le samedi");
  });

  it('issue ids are unique (the UI keys rows by id)', () => {
    const r = evaluate('je aime le foot, je aime le tennis et je aime le rugby avec mon mère et mon sœur', base);
    const ids = (r.issues ?? []).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('one grammar item per rule — skill evidence records that a rule fired, not how often', () => {
    const r = evaluate("je aime le sport et je aime aussi la musique avec mes amis le samedi", base);
    expect(r.grammar.critical.filter((g) => g.theme === 'Elision & Contraction')).toHaveLength(1);
  });
});

describe('corrections are real French, not labels', () => {
  it('a rewritable slip shows its exact fix', () => {
    const r = evaluate('Je aime jouer à le foot avec mes amis chaque semaine au parc', base);
    const fixes = Object.fromEntries((r.issues ?? []).map((i) => [i.quote, i.correction]));
    expect(fixes['Je aime']).toBe("J'aime");
    expect(fixes['à le']).toBe('au');
  });

  it('être verbs: exact for il/elle/ils/elles, gender-neutral label for je/nous', () => {
    const r = evaluate("elle a resté à la maison mais nous avons arrivé en retard au collège", base);
    const fixes = Object.fromEntries((r.issues ?? []).map((i) => [i.quote, i.correction]));
    expect(fixes['elle a resté']).toBe('elle est restée');
    expect(fixes['nous avons arrivé']).toBe('nous sommes arrivé(e)s');
    // « nous sommes arrivé(e)s » needs the speaker's gender: no mechanical rewrite.
    expect(r.improved_answer).toBeUndefined();
  });
});

describe('second rule set rewrites', () => {
  it.each([
    ['gen_det', "j'habite avec mon mère", "j'habite avec ma mère"],
    ['gen_det', 'on va au plage', 'on va à la plage'],
    ['gen_det', 'je fais de la sport', 'je fais du sport'],
    ['adj_after_etre', 'mon mère est très gentil', 'ma mère est très gentille'],
    ['adj_after_etre', 'mes parents sont heureux', null],
    ['adj_after_etre', 'elles sont sportif', 'elles sont sportives'],
    ['neg_missing_ne_more', "c'est pas facile", "ce n'est pas facile"],
    ['neg_missing_ne_more', 'il y a pas de piscine', "il n'y a pas de piscine"],
    ['neg_missing_ne', "j'aime pas les maths", "je n'aime pas les maths"],
    ['neg_missing_ne', 'je sais pas', 'je ne sais pas'],
    ['si_conditional', "si j'aurais le temps", "si j'avais le temps"],
    ['si_conditional', 'si je serais riche', "si j'étais riche"],
    ['si_conditional', 'si il ferait beau', "s'il faisait beau"],
    ['el_si_il', 'si ils viennent', "s'ils viennent"],
    ['prep_country_city', 'je vais à Espagne', 'je vais en Espagne'],
    ['prep_country_city', "j'habite en Londres", "j'habite à Londres"],
    ['prep_country_city', 'je vais à Japon', 'je vais au Japon'],
    ['prep_verb_de_inf', "j'aime d'aller au cinéma", "j'aime aller au cinéma"],
    ['refl_missing', 'je lève à sept heures', 'je me lève à sept heures'],
    ['refl_missing', 'elle habille vite le matin', null],
    ['refl_missing', 'je habille tôt', "je m'habille tôt"],
    ['prep_jouer', 'je joue le tennis', 'je joue au tennis'],
    ['prep_jouer', 'ils jouent les foot', 'ils jouent aux foot'],
    ['prep_jouer_instrument', 'elle joue la guitare', 'elle joue de la guitare'],
    ['prep_jouer_instrument', 'je joue au piano', 'je joue du piano'],
    ['comp_plus_meilleur', 'plus meilleur', 'meilleur'],
    ['ang_tres_beaucoup', "j'aime très beaucoup", "j'aime beaucoup"],
    ['ang_depend_sur', 'ça dépend sur le temps', 'ça dépend du temps'],
    ['ang_interesse_dans', 'intéressé dans', 'intéressé par'],
    ['subj_il_faut', 'il faut que je vais au lit', "il faut que j'aille au lit"],
    ['ang_age', "je suis 15 ans", "j'ai 15 ans"],
  ])('%s: « %s » → « %s »', (id, input, expected) => {
    expect(rewrite(id, input)).toBe(expected);
  });
});

describe('quoted strengths', () => {
  const answer =
    "Le week-end, je fais du sport avec mes amis. Samedi dernier, j'ai joué au tennis et c'était génial. À mon avis, le sport est meilleur que les jeux vidéo parce que c'est bon pour la santé. L'année prochaine, je vais aller en France.";

  it('quotes the learner verbatim, strongest first, at most four', () => {
    const r = evaluate(answer, base);
    expect(r.strengths?.length).toBeGreaterThanOrEqual(2);
    expect(r.strengths!.length).toBeLessThanOrEqual(4);
    for (const s of r.strengths!) expect(answer).toContain(s.quote);
    expect(r.strengths![0].quote).toBe("j'ai joué au tennis");
  });

  it('never praises words it also corrects', () => {
    const t = "L'année dernière nous avons allé en Espagne et c'était génial parce que il faisait beau.";
    const r = evaluate(t, base);
    const errorQuotes = (r.issues ?? []).map((i) => i.quote);
    for (const s of r.strengths ?? []) {
      for (const q of errorQuotes) expect(s.quote.includes(q) || q.includes(s.quote)).toBe(false);
    }
    // The blocked first past tense is skipped; the later correct one is found.
    expect(r.strengths?.map((s) => s.quote)).toContain("c'était génial");
  });

  it('adds the subject to a bare conditional and does not end on a dangling word', () => {
    const r = evaluate("Plus tard, j'irais en Italie et je voudrais devenir médecin avec mes amis.", base);
    const quotes = (r.strengths ?? []).map((s) => s.quote);
    expect(quotes[0]).toMatch(/^j'irais/);
    for (const q of quotes) expect(q).not.toMatch(/\s(et|en|de|à|au|pour)$/);
  });

  it('strength lines never mention a mark, band or grade', () => {
    for (const why of Object.values(STRENGTH_WHY)) expect(claimMentionsMarkOrBand(why)).toBe(false);
  });
});

describe('self-corrections', () => {
  it('a slip repaired straight away is credited, not listed — and left out of the improved answer', () => {
    const t = "je aime, pardon, j'aime le sport et je pense que c'est très important pour la santé.";
    const r = evaluate(t, base);
    expect((r.issues ?? []).some((i) => i.quote === 'je aime')).toBe(false);
    expect(r.selfCorrections).toEqual([{ quote: 'je aime', correction: "j'aime", repair: "j'aime" }]);
    expect(r.improved_answer).toBe("j'aime le sport et je pense que c'est très important pour la santé.");
  });

  it('a fix that only deletes words is not mistaken for a repair', () => {
    const r = evaluate('Je veux de visiter Londres avec ma famille cet été.', base);
    expect(r.selfCorrections).toBeUndefined();
    expect((r.issues ?? []).map((i) => i.quote)).toContain('veux de visiter');
  });
});

describe('overlapping diagnoses', () => {
  it('withholds the improved answer when one fix would leave another error in place', () => {
    // el_que wins « que il »; the subjunctive slip around it can't be rewritten alongside it.
    const r = evaluate("il faut que il est à l'heure pour le match de foot demain", base);
    expect(r.improved_answer).toBeUndefined();
  });

  it('a rewrite that repairs the overlapped words too keeps the improved answer', () => {
    const r = evaluate("si il ferait beau, on irait à la plage avec mes amis", base);
    expect(r.improved_answer).toBe("s'il faisait beau, on irait à la plage avec mes amis");
  });
});

describe('English in the answer', () => {
  it('a known English phrase becomes a fix with real French', () => {
    const r = evaluate('Le samedi je joue au foot with my friends et après on mange une pizza.', base);
    const english = (r.issues ?? []).find((i) => i.id === 'english_words');
    expect(english?.quote).toBe('with my friends');
    expect(english?.correction).toBe('avec mes amis');
    expect(r.improved_answer).toBeUndefined();
  });

  it('English it cannot translate becomes a next step, never an invented correction', () => {
    const r = evaluate('Le samedi je vais au parc with the dog et je mange une glace avec ma sœur.', base);
    expect((r.issues ?? []).some((i) => i.category === 'vocabulary' && i.quote.includes('with'))).toBe(false);
    expect(r.expansion_ideas?.[0]).toBe(NEXT_STEP_COPY.english(['with the']));
  });

  it('French words and loanwords are not English', () => {
    expect(checkEnglish('Le week-end je fais du sport, du shopping et je bois du the.').runs).toEqual([]);
  });

  it('a mostly-English answer gets one honest fix and no praise', () => {
    const r = evaluate('My family is very big and I like my sister because she is funny and we play games every day.', base);
    expect(r.strengths).toEqual([]);
    expect(r.best_moment).toBeUndefined();
    expect(r.strongestMomentExplanation).toBeUndefined();
    expect(r.issues).toHaveLength(1);
    expect(r.issues![0].correction).toBe("J'habite avec ma mère et mon frère.");
    expect(r.encouragement).toContain('« My family is very big and I like »');
    expect(r.unscored).toBe('no_llm_offline');
  });
});

describe('next steps for the question', () => {
  it('invites the past when the question asks for it and none was detected', () => {
    const r = evaluate("J'habite avec ma mère et mon frère dans une petite maison à la campagne.", withDemands(['present', 'past']));
    expect(r.expansion_ideas).toContain(NEXT_STEP_COPY.past);
  });

  it('does not invite the past when the answer already has one', () => {
    const r = evaluate("L'été dernier, je suis allé à la plage avec ma famille parce que c'était les vacances.", withDemands(['past']));
    expect(r.expansion_ideas ?? []).not.toContain(NEXT_STEP_COPY.past);
  });

  it('at most three, and none mentions a mark, band or grade', () => {
    const r = evaluate("J'habite avec ma mère et mon frère dans une maison.", withDemands(['past', 'future']));
    expect(r.expansion_ideas!.length).toBeLessThanOrEqual(3);
    for (const idea of r.expansion_ideas!) expect(claimMentionsMarkOrBand(idea)).toBe(false);
  });
});

describe('words leaned on', () => {
  it('a word used again and again gets alternatives, quoting it as written', () => {
    const r = evaluate("Mon collège est très grand, très moderne et très intéressant, et mes profs sont sympas.", base);
    const tres = r.vocabularyV2?.find((v) => v.basic === 'très');
    expect(tres?.tier).toBe('repetitive');
    expect(tres?.upgrades.map((u) => u.phrase)).toContain('vraiment');
  });
});

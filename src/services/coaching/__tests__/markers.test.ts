import { describe, it, expect } from 'vitest';
import {
  findMarker,
  hasConditional,
  hasConnectors,
  hasJustification,
  hasOpinion,
  hasPastOrFuture,
  hasPerspective,
  hasSubjunctive,
  type MarkerKind,
} from '../diagnosticEngine';

/**
 * Batch 6b-0: the French marker detectors, on real phrases.
 *
 * JS `\b` is ASCII-only, so the old regexes never matched a marker that starts
 * or ends in an accented letter (« à mon avis », « d'un côté », « c'était »,
 * every « …é » participle). Each "was missed" row below is one of those; each
 * "was wrongly matched" row is a noun the old conditional suffix match took for
 * a verb. A miss still only means "not detected", never "not done".
 */

type Row = [text: string, quote: string];

function expectFound(kind: MarkerKind, rows: Row[]) {
  for (const [text, quote] of rows) {
    const hit = findMarker(text, kind);
    expect(hit, `${kind} in « ${text} »`).not.toBeNull();
    expect(hit?.quote, `${kind} quote in « ${text} »`).toBe(quote);
    // Grounded: the quote is a verbatim slice of what was said.
    expect(text.includes(hit!.quote)).toBe(true);
  }
}

function expectAbsent(kind: MarkerKind, texts: string[]) {
  for (const text of texts) expect(findMarker(text, kind), `${kind} in « ${text} »`).toBeNull();
}

describe('justification', () => {
  it('finds a reason and quotes what follows the marker, to the end of the clause', () => {
    expectFound('justification', [
      ["Je l'aime parce que c'est drôle, et voilà", "parce que c'est drôle"],
      ["parce qu'il est sympa", "parce qu'il est sympa"],
      ["Car j'aime ça", "Car j'aime ça"],
      ["c’est pourquoi je reste", "c’est pourquoi je reste"],
      ['parce que', 'parce que'],
    ]);
  });

  it('finds the accent-edged markers the old regex missed (étant donné, grâce à)', () => {
    expectFound('justification', [
      ['étant donné que je suis jeune', 'étant donné que je suis jeune'],
      ['grâce à mon prof', 'grâce à mon prof'],
    ]);
  });

  it('caps the quote at five words after the marker', () => {
    expect(findMarker('parce que un deux trois quatre cinq six sept', 'justification')?.quote).toBe(
      'parce que un deux trois quatre cinq',
    );
  });

  it('does not take « car » (the coach/bus) after a determiner or « en » for a reason', () => {
    expectAbsent('justification', ["je prends le car pour aller à l'école", 'je vais en car', 'un car scolaire', 'mon car arrive']);
  });

  it('does not match inside a longer word', () => {
    expectAbsent('justification', ['parce quelque chose', 'un scarabée', 'carotte']);
  });
});

describe('opinion, perspective, subjunctive, connectors (accent boundaries)', () => {
  it('finds « à mon avis » and « il me semble » (the first was missed: leading « à »)', () => {
    expectFound('opinion', [
      ["à mon avis c'est bien", 'à mon avis'],
      ['Il me semble que oui', 'Il me semble'],
    ]);
  });

  it("finds « d'un côté » (was missed: trailing « é »)", () => {
    expectFound('perspective', [
      ["d'un côté c'est bien", "d'un côté"],
      ["D’un côté, mais d’autre part", 'D’un côté'],
    ]);
  });

  it('finds « à condition que » (was missed: leading « à »)', () => {
    expectFound('subjunctive', [['à condition que tu viennes', 'à condition que']]);
  });

  it('finds the connectors it always found', () => {
    expectFound('connectors', [
      ['néanmoins', 'néanmoins'],
      ["c'est pourquoi", "c'est pourquoi"],
    ]);
  });
});

describe('conditional', () => {
  it('finds conditional verbs, regular and irregular', () => {
    expectFound('conditional', [
      ["j'irais au Japon", 'irais'],
      ['ce serait super', 'serait'],
      ['je voudrais', 'voudrais'],
      ['je pourrais', 'pourrais'],
      ["j'aurais", 'aurais'],
      ['elles aimeraient', 'aimeraient'],
      ['nous ferions', 'ferions'],
      ['vous seriez', 'seriez'],
      ['je devrais', 'devrais'],
      ['cela permettrait de voyager', 'permettrait'],
      ['je mettrais', 'mettrais'],
      ['on connaîtrait', 'connaîtrait'],
      ['nous devrions', 'devrions'],
    ]);
  });

  it('does not take nouns, adverbs, present tense or the imparfait for a conditional', () => {
    expectAbsent('conditional', [
      'je parle anglais',
      'les informations',
      'mais jamais',
      'le français',
      'des fruits frais',
      'un portrait',
      'les options',
      'nous rions',
      "j'adorais", // imparfait: -ais, but the stem is not an infinitive
      'un trait de caractère', // -tr- is only accepted after -et- / -aî-, so « trait » / « portrait » stay out
      'un portrait',
      'des vrais amis', // « vrais » is "true", not a -vr- verb
      'nous respirions', // imparfait of an -irer verb, not the conditional of an -ir one
      'vous ouvriez',
      'je rentrais chez moi',
      'je fais du sport et je vais au marché',
    ]);
  });
});

describe('past', () => {
  it('finds the passé composé with avoir (was missed: « mangé » ends in an accent)', () => {
    expectFound('past', [
      ["j'ai mangé une pizza", "j'ai mangé"],
      ['Hier, j’ai joué au foot', 'j’ai joué'],
      ['nous avons visité Paris', 'nous avons visité'],
      ["je l'ai acheté", "je l'ai acheté"],
      ["j'ai fait mes devoirs", "j'ai fait"],
      ["je n'ai pas vu", "je n'ai pas vu"],
      ['on a été à la plage', 'on a été'],
      ["J'AI MANGÉ", "J'AI MANGÉ"],
    ]);
  });

  it('finds the passé composé with être, agreeing in gender and number', () => {
    expectFound('past', [
      ['je suis allé en France', 'je suis allé'],
      ['elle est allée', 'elle est allée'],
      ['ils sont partis', 'ils sont partis'],
      ['je suis né en 2008', 'je suis né'],
    ]);
  });

  it('finds the reflexive passé composé', () => {
    expectFound('past', [
      ['je me suis levé tôt', 'je me suis levé'],
      ["ça s'est bien passé", "s'est bien passé"],
      ['nous nous sommes amusés', 'nous nous sommes amusés'],
    ]);
  });

  it("finds the imparfait of être / avoir (was missed: « c'était » starts with an accent)", () => {
    expectFound('past', [
      ["c'était super", "c'était"],
      ["j'étais petit", "j'étais"],
      ['il y avait du monde', 'il y avait'],
    ]);
  });

  it('does not take the present, an adjective in -é, or a noun for a past tense', () => {
    expectAbsent('past', [
      'je suis fatigué',
      'je suis passionné par le sport',
      'je mange',
      "c'est parti",
      'les avions sont rapides',
      'il a un café',
      "je vais à l'école",
      "l'été est fini",
    ]);
  });
});

describe('future', () => {
  it('finds the simple future behind a subject', () => {
    expectFound('future', [
      ['je mangerai', 'je mangerai'],
      ["j'irai", "j'irai"],
      ['il y aura', 'il y aura'],
      ['on ira', 'on ira'],
      ['je ne serai pas là', 'je ne serai'],
      ['nous irons', 'nous irons'],
      ['ils pourront', 'ils pourront'],
      ["quand j'aurai vingt ans", "j'aurai"],
      ['il devra partir', 'il devra'],
      ['je mettrai ça', 'je mettrai'],
    ]);
  });

  it('finds the near future', () => {
    expectFound('future', [
      ['je vais aller', 'je vais aller'],
      ['on va manger', 'on va manger'],
      ['je vais le faire', 'je vais le faire'],
      ['ça va être cool', 'ça va être'],
      ['tu vas voir', 'tu vas voir'],
      ['je vais me coucher', 'je vais me coucher'],
      ['je vais bientôt partir', 'je vais bientôt partir'],
    ]);
  });

  it('does not take « vrai », the present, « aller + place » or the conditional for a future', () => {
    expectAbsent('future', [
      "c'est vrai",
      "je vais à l'école",
      'je vais au parc',
      'je vais chez mon père',
      'je vais en mer',
      'ça va bien',
      'vous entrez',
      'nous mangeons',
      'nous adorons',
      'nous préparons',
      'nous respirons', // present of respirer: « -irons » is ambiguous, so only « irons » counts
      'vous ouvrez',
      'ce vrai problème',
      'un opéra',
      "j'irais",
    ]);
  });
});

describe('boolean wrappers keep their old signatures', () => {
  it('hasPastOrFuture is past or future', () => {
    expect(hasPastOrFuture("j'ai mangé")).toBe(true);
    expect(hasPastOrFuture('je mangerai')).toBe(true);
    expect(hasPastOrFuture('je vais aller')).toBe(true);
    expect(hasPastOrFuture('je mange tous les jours')).toBe(false);
  });

  it('the other detectors agree with findMarker', () => {
    expect(hasJustification('parce que')).toBe(true);
    expect(hasOpinion('à mon avis')).toBe(true);
    expect(hasPerspective("d'un côté")).toBe(true);
    expect(hasSubjunctive('il faut que je fasse')).toBe(true);
    expect(hasConnectors('cependant')).toBe(true);
    expect(hasConditional("j'irais")).toBe(true);
    expect(hasJustification('je mange')).toBe(false);
  });

  it('are all false on an empty transcript', () => {
    for (const fn of [hasJustification, hasOpinion, hasPerspective, hasSubjunctive, hasConnectors, hasConditional, hasPastOrFuture]) {
      expect(fn('')).toBe(false);
    }
  });
});

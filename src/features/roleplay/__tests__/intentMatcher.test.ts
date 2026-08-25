import { describe, it, expect } from 'vitest';
import { matchIntent, scoreTriggers, stem, tokenize, triggersForState } from '../intentMatcher';
import { MARGIN, MIN_SCORE } from '../constants';
import { bakeryMeta } from '../../../data/scenarios/bakery.meta';
import type { BranchTrigger } from '../types';

/**
 * The adversarial list is enumerated in the plan under "Intent matcher:
 * failure and ambiguity semantics" — every case below is one of its bullets.
 */

const S = 'start';
const t = (intent: string, terms: string[], priority?: number): BranchTrigger =>
  priority === undefined ? { state: S, intent, terms } : { state: S, intent, terms, priority };

describe('tokenize — rule 1 normalization', () => {
  it('lowercases and strips diacritics', () => {
    expect(tokenize('Pâtisserie ÉCOLE Où')).toEqual(['patisserie', 'ecole', 'ou']);
  });

  it('strips punctuation but keeps intra-word apostrophe and hyphen', () => {
    expect(tokenize('Bonjour, je peux ? Oui !')).toEqual(['bonjour', 'je', 'peux', 'oui']);
    expect(tokenize('petit-dejeuner')).toEqual(['petit-dejeuner']);
  });

  it('expands French elisions into separate tokens', () => {
    expect(tokenize("j'ai l'addition qu'il n'y a")).toEqual([
      'j', 'ai', 'l', 'addition', 'qu', 'il', 'n', 'y', 'a',
    ]);
  });

  it('does not split a word whose apostrophe is not an elision boundary', () => {
    expect(tokenize("aujourd'hui")).toEqual(["aujourd'hui"]);
  });

  it('collapses whitespace and returns nothing for an empty input', () => {
    expect(tokenize('   \n\t  ')).toEqual([]);
    expect(tokenize('')).toEqual([]);
  });

  it('normalizes the curly apostrophe to the straight one', () => {
    expect(tokenize('c’est tout')).toEqual(['c', 'est', 'tout']);
  });
});

describe('stem — rule 2 light inflection', () => {
  it('strips a trailing suffix only when the stem stays at least 4 chars', () => {
    expect(stem('billets')).toBe('billet');
    expect(stem('parlent')).toBe('parl');
    expect(stem('les')).toBe('les');   // stem would be 1 char
    expect(stem('pain')).toBe('pain'); // no suffix
  });
});

describe('matchIntent — accents and case', () => {
  const triggers = [t('pastry', ['patisserie'])];

  it('matches regardless of case and accent', () => {
    expect(matchIntent('Je voudrais une PÂTISSERIE', triggers)).toEqual({
      kind: 'matched', intent: 'pastry', score: 1,
    });
  });
});

describe('matchIntent — rule 3 negation', () => {
  const triggers = [t('ticket', ['billet'])];

  it('discards a term negated within 3 tokens before it', () => {
    expect(matchIntent('je ne veux pas de billet', triggers)).toEqual({ kind: 'no_match' });
  });

  it('does not discard a term when the negator is further than 3 tokens back', () => {
    expect(matchIntent('non merci pour tout le reste je veux un billet', triggers)).toEqual({
      kind: 'matched', intent: 'ticket', score: 1,
    });
  });

  it('discards a negated phrase term', () => {
    const phrase = [t('coffee', ['cafe a emporter'])];
    expect(matchIntent('je ne veux pas un cafe a emporter', phrase)).toEqual({ kind: 'no_match' });
  });

  it('still matches a clean later occurrence after a negated earlier one', () => {
    expect(matchIntent('pas de billet, enfin si, un billet', triggers)).toEqual({
      kind: 'matched', intent: 'ticket', score: 1,
    });
  });
});

describe('matchIntent — rule 2 ordered phrases', () => {
  const triggers = [t('breakfast', ['formule petit-dejeuner'])];

  it('matches an ordered token subsequence and scores 2', () => {
    expect(matchIntent('la formule du petit-dejeuner', triggers)).toEqual({
      kind: 'matched', intent: 'breakfast', score: 2,
    });
  });

  it('does not match when the phrase order is violated', () => {
    expect(matchIntent('petit-dejeuner en formule', triggers)).toEqual({ kind: 'no_match' });
  });

  it('matches an elided multi-token term as an ordered pair', () => {
    expect(matchIntent("je voudrais l'addition", [t('bill', ["l'addition"])])).toEqual({
      kind: 'matched', intent: 'bill', score: 2,
    });
  });
});

describe('matchIntent — substrings must not match', () => {
  it('rejects a term that only appears inside a longer word', () => {
    // "pain" inside "copain"; "gare" inside "garage".
    expect(matchIntent('mon copain', [t('bread', ['pain'])])).toEqual({ kind: 'no_match' });
    expect(matchIntent('le garage', [t('station', ['gare'])])).toEqual({ kind: 'no_match' });
  });
});

describe('matchIntent — overlapping siblings (gare: ticket vs machine)', () => {
  // gare.start really does carry both `ticket` and `machine` as sibling
  // intents; a naive matcher lets "billet" alone select either.
  const triggers = [
    t('ticket', ['billet', 'aller-retour']),
    t('machine', ['machine', 'automate', 'machine a billets']),
  ];

  it('picks the specific sibling when the utterance names the machine', () => {
    // machine: "machine" (1) + phrase "machine a billets" (2) = 3;
    // ticket: "billet" stems to match "billets" (0.7). Gap 2.3 >= MARGIN.
    const result = matchIntent('la machine a billets', triggers);
    expect(result).toEqual({ kind: 'matched', intent: 'machine', score: 3 });
  });

  it('picks the ticket sibling for a plain ticket request', () => {
    expect(matchIntent('je voudrais un billet', triggers)).toEqual({
      kind: 'matched', intent: 'ticket', score: 1,
    });
  });
});

describe('matchIntent — rule 4 decision boundaries', () => {
  it('returns no_match below MIN_SCORE', () => {
    // A stemmed-only hit scores 0.7, which is below MIN_SCORE.
    const result = matchIntent('les billets', [t('ticket', ['billet'])]);
    expect(MIN_SCORE).toBe(1.0);
    expect(result).toEqual({ kind: 'no_match' });
  });

  it('scores a stemmed match strictly below an exact match', () => {
    const stemmed = scoreTriggers('les billets', [t('ticket', ['billet'])])[0];
    const exact = scoreTriggers('un billet', [t('ticket', ['billet'])])[0];
    expect(stemmed.score).toBeLessThan(exact.score);
    expect(stemmed.score).toBeCloseTo(0.7);
    expect(exact.score).toBe(1);
  });

  it('returns ambiguous on an exact tie with equal priority', () => {
    const triggers = [t('bread', ['pain']), t('pastry', ['croissant'])];
    const result = matchIntent('un pain et un croissant', triggers);
    expect(result).toEqual({ kind: 'ambiguous', candidates: ['bread', 'pastry'] });
  });

  it('returns ambiguous for a near-tie inside MARGIN', () => {
    // bread: exact 1. pastry: phrase 2 minus nothing => use a 1.7 vs 2 gap.
    const triggers = [
      t('pastry', ['pain au chocolat']),          // phrase -> 2
      t('bread', ['pain', 'baguettes']),          // exact 1 + stemmed 0.7 = 1.7
    ];
    const scored = scoreTriggers('un pain au chocolat et des baguette', triggers);
    expect(scored[0].score - scored[1].score).toBeLessThan(MARGIN);
    expect(matchIntent('un pain au chocolat et des baguette', triggers)).toEqual({
      kind: 'ambiguous', candidates: ['pastry', 'bread'],
    });
  });

  it('lets a higher priority break a tie outright', () => {
    const triggers = [t('bread', ['pain'], 1), t('pastry', ['croissant'], 0)];
    expect(matchIntent('un pain et un croissant', triggers)).toEqual({
      kind: 'matched', intent: 'bread', score: 1,
    });
  });

  it('is order-independent: reversing the trigger array changes nothing', () => {
    const a = [t('bread', ['pain'], 1), t('pastry', ['croissant'])];
    const b = [...a].reverse();
    expect(matchIntent('un pain et un croissant', a)).toEqual(matchIntent('un pain et un croissant', b));
  });
});

describe('matchIntent — degenerate transcripts', () => {
  const triggers = [t('yes', ['oui'], 1), t('no', ['non', 'ce sera tout'])];

  it('matches a one-word utterance', () => {
    expect(matchIntent('oui', triggers)).toEqual({ kind: 'matched', intent: 'yes', score: 1 });
  });

  it('returns no_match for an empty transcript', () => {
    expect(matchIntent('', triggers)).toEqual({ kind: 'no_match' });
  });

  it('returns no_match for a whitespace-only transcript', () => {
    expect(matchIntent('   \t\n ', triggers)).toEqual({ kind: 'no_match' });
  });

  it('returns no_match when there are no triggers at all', () => {
    expect(matchIntent('je voudrais un pain', [])).toEqual({ kind: 'no_match' });
  });
});

describe('matchIntent — rule 5 multi-intent utterance', () => {
  it('resolves to the single highest-scoring intent, keeping the runner-up visible', () => {
    const triggers = [
      t('ticket', ['je voudrais un billet', 'billet']),
      t('toilets', ['toilettes']),
    ];
    const utterance = 'je voudrais un billet, et ou sont les toilettes';
    expect(matchIntent(utterance, triggers)).toEqual({
      kind: 'matched', intent: 'ticket', score: 3,
    });
    // The runner-up still clears MIN_SCORE, which is what the UI needs in
    // order to acknowledge it in the follow-up hint.
    const scored = scoreTriggers(utterance, triggers);
    expect(scored[1]).toEqual({ intent: 'toilets', score: 1, priority: 0 });
  });
});

describe('scoreTriggers — aggregation', () => {
  it('sums a trigger’s matched terms, counting each term once', () => {
    const [top] = scoreTriggers('pain pain baguette', [t('bread', ['pain', 'baguette'])]);
    expect(top.score).toBe(2);
  });

  it('takes the strongest of several trigger sets sharing one intent, never their sum', () => {
    const triggers: BranchTrigger[] = [
      { state: S, intent: 'bread', terms: ['pain'] },
      { state: S, intent: 'bread', terms: ['pain', 'baguette'] },
    ];
    const [top] = scoreTriggers('un pain et une baguette', triggers);
    expect(top.score).toBe(2);
  });
});

describe('triggersForState — rule 6', () => {
  it('selects only the triggers authored for that state', () => {
    const forStart = triggersForState(bakeryMeta.triggers, 'start');
    const forElse = triggersForState(bakeryMeta.triggers, 'ask_anything_else');
    expect(forStart.every((x) => x.state === 'start')).toBe(true);
    expect(forElse.map((x) => x.intent).sort()).toEqual(['no', 'yes']);
  });

  it('returns an empty list for a state with no authored triggers', () => {
    expect(triggersForState(bakeryMeta.triggers, 'go_to_cashier')).toEqual([]);
  });
});

describe('matchIntent — against the real authored bakery triggers', () => {
  const start = triggersForState(bakeryMeta.triggers, 'start');
  const anythingElse = triggersForState(bakeryMeta.triggers, 'ask_anything_else');

  it('routes a bread request to the bread branch', () => {
    expect(matchIntent('Bonjour, je voudrais du pain s’il vous plaît', start)).toEqual({
      kind: 'matched', intent: 'bread', score: 1,
    });
  });

  it('routes a pain-au-chocolat request to pastry, not bread', () => {
    // `pastry` scores the phrase (2); `bread` scores `pain` (1). Gap 1 >= MARGIN.
    expect(matchIntent('un pain au chocolat', start)).toEqual({
      kind: 'matched', intent: 'pastry', score: 2,
    });
  });

  it('routes a refusal at ask_anything_else to `no`', () => {
    // Scores 1, not 3: `non` is itself a rule-3 negator, so it suppresses the
    // `ce sera tout` term two tokens later. The bare `non` term still matches
    // on its own, so the branch decision is unaffected — but the interaction
    // is real and is pinned here deliberately.
    expect(matchIntent('Non merci, ce sera tout', anythingElse)).toEqual({
      kind: 'matched', intent: 'no', score: 1,
    });
  });

  it('scores the full refusal when the leading `non` is absent', () => {
    expect(matchIntent('ce sera tout, merci', anythingElse)).toEqual({
      kind: 'matched', intent: 'no', score: 2,
    });
  });

  it('routes a bare oui to `yes`', () => {
    expect(matchIntent('oui', anythingElse)).toEqual({
      kind: 'matched', intent: 'yes', score: 1,
    });
  });
});

import { describe, it, expect } from 'vitest';
import { evaluateDemandSatisfaction } from '../satisfaction';
import type { CognitiveDemand, LearnStructure, QuestionDemands, ResponseLoad } from '../types';

function demandsOf(
  cognitiveDemand: CognitiveDemand,
  responseLoad: ResponseLoad = 'developed',
  structures: LearnStructure[] = [],
): Pick<QuestionDemands, 'cognitiveDemand' | 'structures' | 'responseLoad'> {
  return { cognitiveDemand, responseLoad, structures };
}

/** Repeats a filler word to hit an exact word count without tripping any marker. */
function words(n: number): string {
  return Array.from({ length: n }, () => 'chat').join(' ');
}

describe('evaluateDemandSatisfaction — word count / not_attempted (authoritative both directions)', () => {
  it('below 0.4x the responseLoad floor -> not_attempted, regardless of demand', () => {
    // developed floor = 40 words; 0.4x = 16
    expect(evaluateDemandSatisfaction(words(5), demandsOf('justify'))).toBe('not_attempted');
  });

  it('at exactly the 0.4x floor boundary is no longer not_attempted', () => {
    // developed floor = 40; 0.4x = 16 words exactly clears the not_attempted check
    expect(evaluateDemandSatisfaction(words(16), demandsOf('describe'))).not.toBe('not_attempted');
  });

  it('clearing the full responseLoad floor -> met for describe (word count is describe\'s only signal)', () => {
    expect(evaluateDemandSatisfaction(words(40), demandsOf('describe'))).toBe('met');
  });

  it('below the full floor but above the not_attempted threshold -> unknown for describe', () => {
    expect(evaluateDemandSatisfaction(words(20), demandsOf('describe'))).toBe('unknown');
  });

  it('describe never resolves not_attempted\'s counterpart to a failure: only met or not_attempted, never unknown-as-failure', () => {
    // Exhaustive over a range: describe must be met or not_attempted, and only
    // "unknown" (never any "failed" value) fills the gap below the floor.
    const results = [0, 5, 10, 15, 20, 25, 30, 35, 39, 40, 45, 60].map((n) =>
      evaluateDemandSatisfaction(words(n), demandsOf('describe')),
    );
    for (const r of results) {
      expect(['met', 'not_attempted', 'unknown']).toContain(r);
    }
    expect(results).toContain('met');
    expect(results).toContain('not_attempted');
  });

  it('respects responseLoad-specific floors (short=15, extended=70)', () => {
    expect(evaluateDemandSatisfaction(words(15), demandsOf('describe', 'short'))).toBe('met');
    expect(evaluateDemandSatisfaction(words(69), demandsOf('describe', 'extended'))).toBe('unknown');
    expect(evaluateDemandSatisfaction(words(70), demandsOf('describe', 'extended'))).toBe('met');
  });
});

describe('evaluateDemandSatisfaction — justification markers (reliable presence, unreliable absence)', () => {
  it('presence of "parce que" -> met', () => {
    const t = 'Je pense que le sport est important parce que ça aide la santé et le moral des gens.';
    expect(evaluateDemandSatisfaction(t, demandsOf('justify'))).toBe('met');
  });

  it('absence of justification markers -> unknown, not a failure (one can justify without "parce que")', () => {
    const t = words(40); // long enough to clear not_attempted, no markers at all
    expect(evaluateDemandSatisfaction(t, demandsOf('justify'))).toBe('unknown');
  });
});

describe('evaluateDemandSatisfaction — opinion markers (reliable presence, fairly reliable absence — still never a failure)', () => {
  it('presence of an opinion marker -> met for justify (via hasOpinion fallback)', () => {
    const t = "À mon avis c'est vraiment une bonne idée pour tout le monde et la société en général.";
    expect(evaluateDemandSatisfaction(t, demandsOf('justify'))).toBe('met');
  });

  it('absence -> unknown, never failed', () => {
    expect(evaluateDemandSatisfaction(words(40), demandsOf('justify'))).toBe('unknown');
  });
});

describe('evaluateDemandSatisfaction — connectors / perspective (reliable presence, reliable absence — closed discourse-marker sets — still never a failure)', () => {
  it('presence of a connector -> met for explain', () => {
    const t = 'Je vais au collège en bus. Cependant, parfois je marche quand il fait beau dehors.';
    expect(evaluateDemandSatisfaction(t, demandsOf('explain', 'short'))).toBe('met');
  });

  it('presence of a perspective marker -> met for compare', () => {
    const t = 'Il est vrai que la mer est relaxante, en revanche la montagne offre plus de choses à faire.';
    expect(evaluateDemandSatisfaction(t, demandsOf('compare', 'short'))).toBe('met');
  });

  it('absence of both -> unknown for compare, never failed', () => {
    expect(evaluateDemandSatisfaction(words(40), demandsOf('compare'))).toBe('unknown');
  });
});

describe('evaluateDemandSatisfaction — past/future tense (reliable presence, unreliable absence — misses être-auxiliary and irregular participles)', () => {
  it('presence of a past/future marker structure tag -> met via justification/perspective fallback path (hypothesize)', () => {
    const t = 'Il est vrai que ce serait formidable, parce que je voudrais vraiment voyager un jour.';
    expect(evaluateDemandSatisfaction(t, demandsOf('hypothesize', 'short'))).toBe('met');
  });

  it('a tense-tagged structure with no marker hit -> unknown, never failed (e.g. je suis allé is not covered by the closed list)', () => {
    const t = demandsOf('describe', 'developed', ['perfect']);
    // "perfect" has no L1 marker at all (STRUCTURE_MARKERS has no entry for it)
    expect(evaluateDemandSatisfaction(words(20), t)).toBe('unknown');
  });
});

describe('evaluateDemandSatisfaction — subjunctive (reliable presence, unreliable absence — 9-form list)', () => {
  it('presence of a subjunctive-tagged structure -> met', () => {
    const t = "Il faut que je fasse attention à mes notes pour réussir mes examens cette année.";
    expect(evaluateDemandSatisfaction(t, demandsOf('justify', 'short', ['subjunctive']))).toBe('met');
  });

  it('absence -> unknown, never failed', () => {
    // "justify" (not describe) so word count alone cannot resolve met; below
    // the developed floor (40) but above the not_attempted threshold (16)
    expect(evaluateDemandSatisfaction(words(20), demandsOf('justify', 'developed', ['subjunctive']))).toBe('unknown');
  });
});

describe('evaluateDemandSatisfaction — conditional (fixed in Stage 4b — reliable presence, still unreliable absence)', () => {
  it('a conditional-tagged structure resolves met when "j\'irais" is present (regex fixed in Stage 4b)', () => {
    const t = "Si j'avais le choix, j'irais directement à la plage avec toute ma famille et mes amis.";
    expect(evaluateDemandSatisfaction(t, demandsOf('justify', 'short', ['conditional']))).toBe('met');
  });

  it('absence resolves unknown (not not_attempted, not met) — absence still unreliable', () => {
    // "justify" (not describe) so word count alone cannot resolve met; below
    // the developed floor (40) but above the not_attempted threshold (16)
    expect(evaluateDemandSatisfaction(words(20), demandsOf('justify', 'developed', ['conditional']))).toBe('unknown');
  });

  it('hypothesize now resolves met via hasConditional directly, not only the justification/perspective fallback', () => {
    const t = "Si je pouvais choisir, j'irais au Japon.";
    expect(evaluateDemandSatisfaction(t, demandsOf('hypothesize', 'short'))).toBe('met');
  });
});

describe("evaluateDemandSatisfaction — sufficientAnswer / countable clauses (never L1-checked)", () => {
  it('is not part of the evaluated shape at all (compile-time: function takes cognitiveDemand/structures/responseLoad only)', () => {
    // No runtime assertion possible for "never checked" — this test documents
    // the contract: evaluateDemandSatisfaction's second argument type omits
    // sufficientAnswer entirely (see the Pick<> in satisfaction.ts).
    const t = 'Je pense que le sport est important parce que ça aide la santé et le moral des gens.';
    const result = evaluateDemandSatisfaction(t, demandsOf('justify'));
    expect(['met', 'not_attempted', 'unknown']).toContain(result);
  });
});

describe('evaluateDemandSatisfaction — return type never includes a "failed" state', () => {
  it('exhaustively spans met / not_attempted / unknown only across all demands and word counts', () => {
    const allDemands: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];
    const seen = new Set<string>();
    for (const d of allDemands) {
      for (const n of [0, 10, 20, 40, 60]) {
        const r = evaluateDemandSatisfaction(words(n), demandsOf(d));
        seen.add(r);
        expect(['met', 'not_attempted', 'unknown']).toContain(r);
      }
    }
  });
});

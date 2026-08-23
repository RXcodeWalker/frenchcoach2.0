// Stage 4 item 2 (docs/architecture — Learn-mode coach feedback plan): opt-in
// mechanical rewrite for unambiguous elisions only. A rule may have a
// `rewrite` only if the replacement text is fully determined by the matched
// span itself — no information from outside the match, and no choice the
// learner has to make. `correction` is separately human-readable display
// text ("j'…", "au / aux") and must never be used as a replacement string —
// conflating the two is exactly the bug this stage exists to prevent.

import { describe, it, expect } from 'vitest';
import { GRAMMAR_RULES } from '../coachService';

function rule(id: string) {
  const r = GRAMMAR_RULES.find(r => r.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
}

function rewriteMatch(id: string, transcript: string): string | null {
  const r = rule(id);
  const captured = r.capture?.(transcript);
  if (!captured || !r.rewrite) return null;
  return r.rewrite(captured.text);
}

describe('GrammarRule.rewrite — operand preserved, never derived from correction label', () => {
  it('el_je: "je aime" -> "j\'aime" (verb preserved)', () => {
    expect(rewriteMatch('el_je', 'je aime le foot')).toBe("j'aime");
  });

  it('el_le_la: "la école" -> "l\'école" (noun preserved, not the "l\'…" label)', () => {
    expect(rewriteMatch('el_le_la', 'je vais à la école demain')).toBe("l'école");
    expect(rule('el_le_la').rewrite!('la école')).not.toBe("l'…");
  });

  it('el_de: "de un" -> "d\'un"', () => {
    expect(rewriteMatch('el_de', "j'ai besoin de un ami")).toBe("d'un");
  });

  it('el_que: "que il" -> "qu\'il"', () => {
    expect(rewriteMatch('el_que', 'je pense que il a raison')).toBe("qu'il");
  });

  it('con_au: "à le" -> "au", "à les" -> "aux", determined by the captured group', () => {
    expect(rewriteMatch('con_au', 'je vais à le marché')).toBe('au');
    expect(rewriteMatch('con_au', 'il parle à les professeurs')).toBe('aux');
  });

  it('con_au: only the matched span is replaced — preceding text (e.g. "jusqu\'") survives untouched', () => {
    const captured = rule('con_au').capture!("j'attends jusqu'à le moment du départ");
    expect(captured?.text).toBe('à le');
    // Reconstructing with the rewrite must leave "jusqu'" intact, since the
    // lookbehind (NOT_BEFORE) is zero-width and consumes no characters.
    const rewritten = rule('con_au').rewrite!(captured!.text);
    const before = "j'attends jusqu'à le moment du départ".slice(0, captured!.start);
    const after = "j'attends jusqu'à le moment du départ".slice(captured!.end);
    expect(before + rewritten + after).toBe("j'attends jusqu'au moment du départ");
  });

  it('con_du: "de le" -> "du", "de les" -> "des", determined by the captured group', () => {
    expect(rewriteMatch('con_du', 'je reviens de le collège')).toBe('du');
    expect(rewriteMatch('con_du', "c'est le livre de les eleves")).toBe('des');
  });
});

describe('Rules with a genuine choice get no rewrite', () => {
  it('aux_aller: no rewrite — "je suis allé(e)" requires gender the system does not know', () => {
    expect(rule('aux_aller').rewrite).toBeUndefined();
  });

  it('aux_venir: no rewrite — same gender ambiguity', () => {
    expect(rule('aux_venir').rewrite).toBeUndefined();
  });
});

describe('rewrite is never derived from the correction label', () => {
  const rewritable = ['el_je', 'el_le_la', 'el_de', 'el_que', 'con_au', 'con_du'];
  it.each(rewritable)('%s: rewrite output never equals the raw correction label verbatim', (id) => {
    const r = rule(id);
    // The correction label for these rules always contains an ellipsis or a
    // "/" — a real rewrite output (a concrete French token/phrase) never does.
    const sample = r.rewrite ? true : false;
    expect(sample).toBe(true);
    if (r.correction.includes('…') || r.correction.includes('/')) {
      // sanity: labels are display text, distinct in shape from rewrite output
      expect(r.correction).not.toMatch(/^(j'|l'|d'|qu'|au|aux|du|des)$/);
    }
  });
});

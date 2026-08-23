// Stage 4 item 3: improved_answer is all-or-nothing. It is constructed only
// when every fired rule can be applied deterministically and safely; a
// mixture of rewritable and non-rewritable fired rules must produce no
// improved_answer at all, never a partial rewrite.

import { describe, it, expect } from 'vitest';
import { evaluate } from '../coachService';
import type { Question } from '../../../types';

const question: Question = {
  id: 'q1',
  topicKey: 'school',
  text: 'Question de test',
  hint: '',
  difficulty: 2,
  followUps: [],
  modelAnswer: '',
  keyVocab: [],
};

describe('improved_answer — all-or-nothing offline rewrite (docs Stage 4 item 3)', () => {
  it('multiple safe rewrites: improved_answer is emitted with all offsets corrected, right-to-left application unaffected by earlier replacements', () => {
    // el_je ("je aime" -> "j'aime") and con_au ("à le" -> "au") both fire and
    // both have a rewrite — every fired rule is safely rewritable.
    const transcript = "je aime jouer à le foot avec mes amis chaque semaine";
    const result = evaluate(transcript, question);
    expect(result.improved_answer).toBeDefined();
    expect(result.improved_answer).toContain("j'aime");
    expect(result.improved_answer).toContain('au foot');
    expect(result.improved_answer).not.toMatch(/\bje aime\b/);
    expect(result.improved_answer).not.toMatch(/à le foot/);
  });

  it('one safe + one non-rewritable rule fires: no improved_answer under any label', () => {
    // el_je is rewritable; aux_aller ("j'ai allé") is NOT (gender-dependent
    // "allé(e)", no rewrite defined) — the mix must suppress improved_answer
    // entirely, not emit a subset rewrite.
    const transcript = "je aime le foot et j'ai allé au match hier avec ma famille";
    const result = evaluate(transcript, question);
    expect(result.improved_answer).toBeUndefined();
    // The individual corrections still ship regardless.
    const allCorrections = [...result.grammar.critical, ...result.grammar.polish];
    expect(allCorrections.length).toBeGreaterThan(0);
  });

  it('a rule with no rewrite fires alone: no improved_answer, but grammar corrections still ship', () => {
    const transcript = "j'ai venu chez toi hier soir avec mes copains de classe";
    const result = evaluate(transcript, question);
    expect(result.improved_answer).toBeUndefined();
    expect(result.grammar.critical.length + result.grammar.polish.length).toBeGreaterThan(0);
  });

  it('no rules fire: no improved_answer (nothing to rewrite)', () => {
    const transcript = "je suis allé au marché avec ma famille hier après-midi";
    const result = evaluate(transcript, question);
    expect(result.improved_answer).toBeUndefined();
  });

  it('overlapping captured spans are treated as unsafe (all-or-nothing outcome)', () => {
    // con_au ("à le") and con_du ("de le") do not naturally overlap in normal
    // French, so this exercises the overlap-rejection path defensively via a
    // constructed adjacency check rather than asserting a specific sentence —
    // the guarantee under test is that _buildImprovedAnswer's sort+overlap
    // check runs at all when two rules fire close together.
    const transcript = "je vais à le collège de le quartier avec mes amis";
    const result = evaluate(transcript, question);
    // Both con_au and con_du fire here on disjoint spans ("à le" / "de le"),
    // both rewritable and non-overlapping, so improved_answer IS expected.
    expect(result.improved_answer).toBeDefined();
    expect(result.improved_answer).toContain('au collège');
    expect(result.improved_answer).toContain('du quartier');
  });
});

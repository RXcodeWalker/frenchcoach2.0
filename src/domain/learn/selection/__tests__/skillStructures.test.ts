import { describe, expect, it } from 'vitest';
import { SKILL_TO_STRUCTURES, practisesAnySkill, structuresForSkills } from '../skillStructures';
import { SKILL_DEFS } from '../../../../services/coaching/diagnosticEngine';
import { QUESTIONS } from '../../../../data/gameData';

describe('SKILL_TO_STRUCTURES', () => {
  it('only names real coach skill ids', () => {
    for (const id of Object.keys(SKILL_TO_STRUCTURES)) expect(SKILL_DEFS[id], id).toBeDefined();
  });

  it('every mapped skill has Learn questions that practise it (or focusing it would do nothing)', () => {
    // No Learn question is tagged `negation` or `subjunctive` yet (a content gap, 2026-11-04); the
    // mapping stays so a future tag is picked up without another code change.
    const untaggedToday = new Set(['negation', 'subjunctive']);
    for (const id of Object.keys(SKILL_TO_STRUCTURES)) {
      if (untaggedToday.has(id)) continue;
      const n = QUESTIONS.filter(q => practisesAnySkill((q.demands?.structures ?? []) as string[], [id])).length;
      expect(n, id).toBeGreaterThan(0);
    }
  });

  it('the coach vocabulary used to miss the past tense entirely — it now finds those questions', () => {
    const literal = QUESTIONS.filter(q => ((q.demands?.structures ?? []) as string[]).includes('tense_past')).length;
    const mapped = QUESTIONS.filter(q => practisesAnySkill((q.demands?.structures ?? []) as string[], ['tense_past'])).length;
    expect(literal).toBe(0);
    expect(mapped).toBeGreaterThan(50);
  });
});

describe('structuresForSkills', () => {
  it('deduplicates and ignores skills with no structure', () => {
    expect(structuresForSkills(['tense_past', 'etre_avoir', 'elision'])).toEqual(['perfect', 'imperfect']);
    expect(structuresForSkills([])).toEqual([]);
  });
});

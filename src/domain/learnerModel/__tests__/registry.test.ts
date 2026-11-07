import { describe, it, expect } from 'vitest';
import { SKILL_DEFS } from '../../../services/coaching/diagnosticEngine';
import { SKILL_TO_STRUCTURES } from '../../learn/selection/skillStructures';
import {
  ALL_DEMANDS,
  ALL_STRUCTURES,
  REGISTRY_SKILL_TO_STRUCTURES,
  SKILL_REGISTRY,
  STRUCTURE_TO_SKILLS,
  UNMAPPED_STRUCTURES,
  isSelectableSkill,
  registryPractisesAnySkill,
  registryStructuresForSkills,
} from '../skills';
import type { LearnStructure } from '../../learn/demand/types';

describe('learner-model §1 — the closed skill registry', () => {
  it('ids are unique', () => {
    const ids = SKILL_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('grammar/lexis entries are exactly the 22 SKILL_DEFS ids, with the same grouping', () => {
    const language = SKILL_REGISTRY.filter((e) => e.kind === 'grammar' || e.kind === 'lexis');
    expect(language.map((e) => e.id).sort()).toEqual(Object.keys(SKILL_DEFS).sort());
    for (const e of language) {
      expect(e.kind === 'grammar').toBe(SKILL_DEFS[e.id].category === 'grammar');
    }
  });

  it('demand entries are exactly demand:<CognitiveDemand>; exam entries are the three 0520 areas', () => {
    expect(SKILL_REGISTRY.filter((e) => e.kind === 'demand').map((e) => e.id).sort())
      .toEqual(ALL_DEMANDS.map((d) => `demand:${d}`).sort());
    expect(SKILL_REGISTRY.filter((e) => e.kind === 'examArea').map((e) => e.id).sort())
      .toEqual(['exam:communication', 'exam:qualityOfLanguage', 'exam:rolePlay']);
  });

  it('every entry is exactly one of: practised by a structure, ubiquitous, or not selectable — and the last two say why', () => {
    for (const e of SKILL_REGISTRY) {
      const shapes = [e.practisedBy.length > 0, e.ubiquitous === true, e.notSelectable === true].filter(Boolean);
      expect(shapes, e.id).toHaveLength(1);
      if (e.ubiquitous || e.notSelectable) expect(e.reason, e.id).toBeTruthy();
    }
  });

  it('every LearnStructure maps to at least one skill or is on the reasoned UNMAPPED_STRUCTURES list', () => {
    for (const s of ALL_STRUCTURES) {
      const claimed = STRUCTURE_TO_SKILLS[s].length > 0;
      const excused = typeof UNMAPPED_STRUCTURES[s] === 'string' && UNMAPPED_STRUCTURES[s]!.length > 0;
      expect(claimed || excused, s).toBe(true);
    }
  });

  it('justification maps to demand:justify and connectors (the plan\'s gap)', () => {
    expect(STRUCTURE_TO_SKILLS.justification).toEqual(expect.arrayContaining(['demand:justify', 'connectors']));
  });

  it('agrees with the hand-written SKILL_TO_STRUCTURES wherever that table speaks (a strict superset)', () => {
    for (const [id, structures] of Object.entries(SKILL_TO_STRUCTURES)) {
      expect(REGISTRY_SKILL_TO_STRUCTURES[id], id).toEqual(structures);
    }
    const added = Object.keys(REGISTRY_SKILL_TO_STRUCTURES).filter((id) => !(id in SKILL_TO_STRUCTURES)).sort();
    expect(added).toEqual(['confusions', 'connectors', 'contrast']);
  });

  it('selection: ubiquitous skills are selectable but narrow nothing; pronunciation and fluency are never selectable', () => {
    expect(isSelectableSkill('gender')).toBe(true);
    expect(registryStructuresForSkills(['gender'])).toEqual([]);
    expect(isSelectableSkill('pronunciation')).toBe(false);
    expect(isSelectableSkill('fluency_score')).toBe(false);
    expect(isSelectableSkill('demand:justify')).toBe(false);
    expect(registryPractisesAnySkill(['justification'] as LearnStructure[], ['connectors'])).toBe(true);
    expect(registryPractisesAnySkill(['perfect'], ['connectors'])).toBe(false);
  });
});

import type { ArchitectDifficulty } from './types';
import type { GeneratedScenario } from '../../types';

export const DIFFICULTY_OPTIONS: {
  id: ArchitectDifficulty;
  label: string;
  blurb: string;
}[] = [
  {
    id: 'supported',
    label: 'Supported',
    blurb: 'Hints ready, vocab open, gentler NPC',
  },
  {
    id: 'standard',
    label: 'Standard',
    blurb: 'Balanced A2–B1 conversation',
  },
  {
    id: 'immersion',
    label: 'Immersion',
    blurb: 'French-first, fewer nudges',
  },
];

/** Append stance hints so the existing turn API can steer the NPC. */
export function withDifficultyPersona(
  scenario: GeneratedScenario,
  difficulty: ArchitectDifficulty
): GeneratedScenario {
  const stance =
    difficulty === 'supported'
      ? ' [Stance: supportive teacher. Speak slightly slower French, offer gentle clarification, welcome partial answers.]'
      : difficulty === 'immersion'
        ? ' [Stance: full immersion. Stay in French, keep replies natural, do not switch to English, expect complete answers.]'
        : ' [Stance: standard A2–B1 roleplay partner.]';

  return {
    ...scenario,
    npc_personality: `${scenario.npc_personality}${stance}`,
  };
}

export const GENERATION_STAGES = [
  'Drafting NPC…',
  'Writing objectives…',
  'Picking vocabulary…',
  'Almost ready…',
] as const;

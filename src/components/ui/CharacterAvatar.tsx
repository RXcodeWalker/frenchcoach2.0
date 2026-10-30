import React from 'react';

export type Expression = 'neutral' | 'happy' | 'thinking' | 'confused' | 'excited';

/** Minimal slice of ScenarioMeta['npc'] this component needs to render. */
export interface CharacterNpc {
  nameFr: string;
  emoji: string;
}

interface CharacterAvatarProps {
  npc: CharacterNpc;
  expression?: Expression;
  /** Second line under the name (the character's role). */
  role?: string;
}

// The character reacts in words, not motion: one short mood line beside the
// name once they have an opinion about the last answer.
const MOOD: Record<Expression, string | null> = {
  neutral: null,
  happy: 'Pleased',
  thinking: 'Thinking it over',
  confused: 'Not quite following',
  excited: 'Impressed',
};

/**
 * The scenario character (Design System v2): a portrait chip with the
 * character's emoji, their name and role. Static — no bounce, glow or scale.
 */
export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ npc, expression = 'neutral', role }) => {
  const mood = MOOD[expression];
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill border border-hairline bg-surface-recessed text-[28px] leading-none"
      >
        {npc.emoji}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-section text-ink">{npc.nameFr}</span>
        <span className="truncate text-caption text-ink-subtle">
          {role}
          {role && mood ? ' · ' : ''}
          {mood && <span aria-live="polite" className="text-ink-muted">{mood}</span>}
        </span>
      </span>
    </div>
  );
};

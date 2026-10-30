/** How a round plays. Classic: 8 sentences, three tries each. Tricky: the same with decoy words in the bank. Speed: a clock. */
export const MODES = ['classic', 'tricky', 'speed'] as const;
export type Mode = (typeof MODES)[number];

/** Which sentences a round draws from. `mixed` ramps from easy to hard. */
export const LEVELS = ['starter', 'standard', 'stretch', 'mixed'] as const;
export type Level = (typeof LEVELS)[number];

export interface Setup {
  mode: Mode;
  level: Level;
}

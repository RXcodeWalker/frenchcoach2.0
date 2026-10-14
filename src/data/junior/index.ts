/** The Junior content bank (pilot: « Moi » and « Les couleurs »). */
import { TOGETHER, WARMUP_AWAKE, WARMUP_PROMPT } from './lines';
import { JUNIOR_PATTERNS } from './patterns';
import { PRAISE } from './praise';
import { COULEURS_QUESTIONS } from './questions/couleurs';
import { MOI_QUESTIONS } from './questions/moi';
import { JUNIOR_THEMES } from './themes';
import type { JuniorBank, JuniorQuestion } from './types';

export const JUNIOR_QUESTIONS: readonly JuniorQuestion[] = [...MOI_QUESTIONS, ...COULEURS_QUESTIONS];

export const JUNIOR_BANK: JuniorBank = {
  themes: JUNIOR_THEMES,
  patterns: JUNIOR_PATTERNS,
  questions: JUNIOR_QUESTIONS,
  fixedLines: [...PRAISE, WARMUP_PROMPT, WARMUP_AWAKE, TOGETHER],
};

export { JUNIOR_PATTERNS, JUNIOR_THEMES, PRAISE, TOGETHER, WARMUP_AWAKE, WARMUP_PROMPT };
export { JUNIOR_AUDIO_FILES, JUNIOR_AUDIO_DIR, audioUrl } from './audioManifest';
export { requiredAudioIds, allBankLines } from './audioIds';
export * from './types';

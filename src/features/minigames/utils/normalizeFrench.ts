/**
 * Canonical French answer normalization for translation minigames.
 * Matches the 5-line NFD implementation shared by RapidFire, SurvivalMode,
 * SpeedSpeaking, SpeakingArena, and BossBattle.
 */
export function normalizeFrench(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[?.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s{2,}/g, ' ');
}

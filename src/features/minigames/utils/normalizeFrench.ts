/**
 * Canonical French answer normalization for translation minigames.
 * Matches the 5-line NFD implementation shared by RapidFire, SurvivalMode,
 * SpeedSpeaking, SpeakingArena, and BossBattle.
 */
export function normalizeFrench(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s{2,}/g, ' ');
}

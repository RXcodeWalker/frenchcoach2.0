/**
 * How Léo says a line (junior-track §7). Pure.
 *
 *   recorded file  → play it;
 *   else a French browser voice → read the French text with it;
 *   else → nothing. The line shows as text with no 🔊.
 *
 * **An English voice never reads French.** There is deliberately no third
 * branch that falls back to "whatever voice the browser has": when the browser
 * has no French voice, `resolveVoice` returns 'none', never 'tts'. The caller
 * reports `hasFrenchVoice` truthfully (ttsService only counts a real fr-* voice).
 */
export type VoiceSource = 'file' | 'tts' | 'none';

export function resolveVoice(input: { hasFile: boolean; hasFrenchVoice: boolean }): VoiceSource {
  if (input.hasFile) return 'file';
  if (input.hasFrenchVoice) return 'tts';
  return 'none';
}

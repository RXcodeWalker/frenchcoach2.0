/**
 * Which of Léo's pre-recorded files exist (junior-track §7: "Voice is pre-recorded
 * audio for the pilot").
 *
 * A file is `public/audio/junior/<audioId>.mp3`, and its id is listed here once it
 * has been recorded and added. The set starts EMPTY on purpose: no recording has
 * been made yet, and a line the app cannot actually say must not offer a 🔊.
 * `requiredAudioIds` (audioIds.ts) is the recording checklist; the audio test fails
 * if this set and the folder ever disagree, or list an id the bank does not use.
 */
export const JUNIOR_AUDIO_FILES: ReadonlySet<string> = new Set<string>([]);

export const JUNIOR_AUDIO_DIR = '/audio/junior';

/** URL of the recorded file for an audio id. */
export function audioUrl(audioId: string): string {
  return `${JUNIOR_AUDIO_DIR}/${audioId}.mp3`;
}

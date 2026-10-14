/**
 * When a Junior turn is read by Whisper instead of Web Speech (junior-track §2,
 * Batch 4). Whisper is used for a question turn when:
 *
 *  - the warm-up chose `whisper` for this mission (sound, but no usable words);
 *  - Web Speech is missing on this browser (iPad Safari);
 *  - Web Speech returned nothing for this turn although the mic heard sound.
 *
 * Never for a silent capture: a silent try is re-asked, not recorded
 * (`isSilent`), and there is no evidence Whisper hears more from a silent mic.
 * Never for the warm-up (always accepted; its own transcript is what tests the
 * recogniser) or « Et toi ? » (always completes, so the words change nothing).
 *
 * When Whisper is asked and gives nothing usable (failed, timed out, refused,
 * or a suspect result), the Web Speech transcript is used as it was. Whisper is
 * never given the expected sentence (no prompt at all): that would turn a
 * mumble into a dishonest "got it".
 *
 * Pure.
 */
import type { Recogniser } from './types';
import { isSilent, transcriptUsable } from './warmup';

export type JuniorTurnKind = 'demo' | 'warmup' | 'question' | 'etToi';

export interface WhisperChoiceInput {
  turn: JuniorTurnKind;
  /** The recogniser the warm-up chose for this mission. */
  recogniser: Recogniser;
  webSpeechSupported: boolean;
  /** Web Speech's transcript for this capture ('' when Web Speech is missing). */
  transcript: string;
  peakMicLevel: number;
}

export function needsWhisper({ turn, recogniser, webSpeechSupported, transcript, peakMicLevel }: WhisperChoiceInput): boolean {
  if (turn !== 'question') return false;
  if (isSilent({ peakMicLevel, transcript })) return false;
  return recogniser === 'whisper' || !webSpeechSupported || !transcriptUsable(transcript);
}

/** Whisper's text when it is usable (null = Whisper gave nothing), otherwise Web Speech's transcript. */
export function chooseTranscript(webSpeech: string, whisper: string | null): string {
  return whisper !== null && transcriptUsable(whisper) ? whisper : webSpeech;
}

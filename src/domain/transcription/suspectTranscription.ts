/**
 * Screens a batch-ASR result before it replaces the live captions. Whisper is
 * known to invent text on silence ("Sous-titres réalisés par…"), to loop on a
 * repeated phrase, and to echo the context prompt back. A student who said
 * nothing must not get a made-up answer marked, so these results fall back to
 * the live captions instead.
 *
 * The thresholds are Whisper's own published defaults (`no_speech_threshold`
 * 0.6, `compression_ratio_threshold` 2.4), not values measured on this app's
 * learners: UNVALIDATED until the stt benchmark (plan Phase 2) sets them.
 * Pure; one implementation, reused by the exam's `asr-rejected` (Phase 4).
 */

export const NO_SPEECH_PROB_LIMIT = 0.6; // UNVALIDATED
export const COMPRESSION_RATIO_LIMIT = 2.4; // UNVALIDATED
/** An echo is only called for text this long: a short answer may legitimately repeat a word of the context. */
const MIN_ECHO_WORDS = 4;

export interface ScreenableSegment {
  noSpeechProb: number | null;
  compressionRatio: number | null;
}

export type SuspectReason = 'no-speech' | 'repetition' | 'prompt-echo' | 'silence-phrase';

function words(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * What Whisper writes on silence or noise: subtitle credits from its training
 * data (« Sous-titres réalisés par la communauté d'Amara.org », « Sous-titre
 * FR », « Merci d'avoir regardé »). A learner answering a question never says
 * these. Matched on the whole text, so an answer that merely contains « merci »
 * is kept.
 */
const SILENCE_PHRASES: readonly RegExp[] = [
  /^sous[ -]?titr/, // sous-titres réalisés par…, sous-titre fr, sous-titrage st'501
  /amara/,
  /^merci d'avoir regardé/,
  /^merci de (?:votre|nous avoir) (?:attention|regardé|suivi)/,
  /abonnez[ -]vous/,
  /^(?:♪|musique|\[musique\]|\(musique\))$/,
  /^thanks? (?:you )?for watching/,
];

/** Whether the whole text is one of Whisper's silence phrases. */
export function isSilencePhrase(text: string): boolean {
  const said = words(text).join(' ');
  const raw = text.normalize('NFC').toLowerCase().trim();
  return SILENCE_PHRASES.some((re) => re.test(said) || re.test(raw));
}

/**
 * Why the result should not be trusted, or null when nothing about it is
 * suspect. `screenSilencePhrases` is Learn's: the exam's `asr-rejected` does
 * not pass it (changing which answers fall back there is an Assessment-Engine
 * change).
 */
export function suspectTranscription(
  text: string,
  segments: readonly ScreenableSegment[],
  prompt?: string,
  options: { screenSilencePhrases?: boolean } = {},
): SuspectReason | null {
  if (options.screenSilencePhrases && isSilencePhrase(text)) return 'silence-phrase';
  const reported = segments.filter((s) => s.noSpeechProb !== null);
  if (reported.length > 0 && reported.every((s) => (s.noSpeechProb as number) >= NO_SPEECH_PROB_LIMIT)) return 'no-speech';
  if (segments.some((s) => s.compressionRatio !== null && s.compressionRatio > COMPRESSION_RATIO_LIMIT)) return 'repetition';

  const heard = words(text);
  if (prompt && heard.length >= MIN_ECHO_WORDS) {
    const context = ` ${words(prompt).join(' ')} `;
    if (context.includes(` ${heard.join(' ')} `)) return 'prompt-echo';
  }
  return null;
}
